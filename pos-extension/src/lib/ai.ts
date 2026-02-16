
export interface JobData {
    company: string;
    role: string;
    location: string;
    work_mode: 'remote' | 'hybrid' | 'onsite' | 'unknown';
    employment_type: 'full-time' | 'part-time' | 'contract' | 'intern' | 'temporary' | 'unknown';
    salary_range: string;
    description: string;
    responsibilities: string[];
    requirements: string[];
    skills: string[];
    url?: string;
    source?: string;
}

export type AIProviderType = 'chrome_builtin' | 'external_openai' | 'external_gemini';

interface AIProvider {
    extractJobDetails(text: string): Promise<JobData>;
    validateAvailability(): Promise<boolean>;
}

// --- Chrome Built-in AI (Nano Gemini) ---
// Note: This relies on window.ai which is experimental
class ChromeBuiltinProvider implements AIProvider {
    async validateAvailability(): Promise<boolean> {
        // @ts-ignore
        return !!(window.ai && await window.ai.canCreateTextSession());
    }

    async extractJobDetails(text: string): Promise<JobData> {
        try {
            // @ts-ignore
            const session = await window.ai.createTextSession();
            const prompt = `
            Extract job details from the following text into a JSON object.
            Do not include markdown formatting. Return raw JSON only.
            Fields: company, role, location, work_mode (remote/hybrid/onsite/unknown), employment_type (full-time/part-time/contract/intern/temporary/unknown), salary_range, description (summary), responsibilities (array), requirements (array), skills (array).
            
            Text:
            ${text.substring(0, 4000)} 
            `;
            // Truncate to avoid token limits if necessary, though Nano should handle reasonable context.

            const result = await session.prompt(prompt);
            const jsonStr = result.replace(/```json|```/g, '').trim();
            return JSON.parse(jsonStr) as JobData;
        } catch (e) {
            console.error("Nano Gemini Extraction Failed", e);
            throw new Error("Failed to extract with Chrome AI");
        }
    }
}

// --- External OpenAI/Gemini Provider ---
class ExternalProvider implements AIProvider {
    constructor(private apiKey: string, private model: 'openai' | 'gemini') { }

    async validateAvailability(): Promise<boolean> {
        return !!this.apiKey;
    }

    async extractJobDetails(text: string): Promise<JobData> {
        console.log(`Using external provider: ${this.model}`);

        if (this.model === 'gemini') {
            try {
                // 1. Fetch available models first
                const listModelsResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`);
                if (!listModelsResponse.ok) {
                    const error = await listModelsResponse.json();
                    throw new Error(`Failed to list models: ${error.error?.message || listModelsResponse.statusText}`);
                }
                const modelsData = await listModelsResponse.json();

                // 2. Strict Model Selection with Safe Fallback
                // Filter models that support 'generateContent'
                const availableModels = (modelsData.models || [])
                    .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
                    .map((m: any) => m.name.replace('models/', '')); // Standardize to just name

                console.log("Available Gemini Models:", availableModels);

                // Exact match preference list
                const preferredOrder = [
                    'gemini-1.5-flash',
                    'gemini-1.5-flash-latest',
                    'gemini-1.5-flash-001',
                    'gemini-1.5-pro',
                    'gemini-1.5-pro-latest',
                    'gemini-1.5-pro-001',
                    'gemini-pro',
                    'gemini-1.0-pro'
                ];

                let selectedModel = preferredOrder.find(pref => availableModels.includes(pref));

                // FALLBACK: Use FIRST available model if no preferred one is found
                if (!selectedModel) {
                    if (availableModels.length > 0) {
                        console.warn(`No preferred model found. Defaulting to first available: ${availableModels[0]}`);
                        selectedModel = availableModels[0];
                    } else {
                        throw new Error("No supported Gemini models found for this API key. Please check your key permissions/region.");
                    }
                }

                if (!selectedModel) throw new Error("No model selected");

                console.log("Selected Gemini Model:", selectedModel);

                const isGemini15 = selectedModel.includes('1.5');

                const prompt = `
                Extract job details from the following text into a JSON object.
                Fields: company, role, location, work_mode (remote/hybrid/onsite/unknown), employment_type (full-time/part-time/contract/intern/temporary/unknown), salary_range, description (summary), responsibilities (array), requirements (array), skills (array).
                
                Text to analyze:
                ${text.substring(0, 10000)} 
                `;

                const generationConfig: any = {
                    temperature: 0.1, // Low temperature for consistent JSON
                };

                // Only add JSON mode for models that support it
                if (isGemini15) {
                    generationConfig.responseMimeType = "application/json";
                }

                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${this.apiKey}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{ text: prompt }]
                        }],
                        generationConfig
                    })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error?.message || 'Gemini API Error');
                }

                const data = await response.json();

                if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content) {
                    // Check for safety blocking
                    if (data.promptFeedback?.blockReason) {
                        throw new Error(`Gemini blocked the prompt: ${data.promptFeedback.blockReason}`);
                    }
                    throw new Error('Gemini returned an empty response. The content might have been filtered.');
                }

                let content = data.candidates[0].content.parts[0].text;

                // Robust JSON Cleaning
                // 1. Remove markdown code blocks
                content = content.replace(/```json\s?/g, '').replace(/```/g, '').trim();

                // 2. Extract first valid JSON object found in text
                const firstBrace = content.indexOf('{');
                const lastBrace = content.lastIndexOf('}');

                if (firstBrace !== -1 && lastBrace !== -1) {
                    content = content.substring(firstBrace, lastBrace + 1);
                } else {
                    console.error("No JSON object found in response:", content);
                    throw new Error("Gemini did not return a valid data structure.");
                }

                try {
                    // Try to parse the cleaned content
                    return JSON.parse(content) as JobData;
                } catch (parseError) {
                    console.error("JSON Parse Error:", parseError);
                    console.log("Attempting second-pass cleanup for truncated JSON...");

                    // Second pass: if it looks like it was cut off (truncated)
                    // This is a common issue with large descriptions
                    if (!content.endsWith('}')) {
                        try {
                            // Simple attempt to close the object if it looks truncated
                            const fixedContent = content + '"}'; // Blind guess but sometimes works for strings
                            return JSON.parse(fixedContent) as JobData;
                        } catch {
                            // If still fails, fall through to main error
                        }
                    }

                    throw new Error("Failed to parse Gemini response. please try again.");
                }

            } catch (e: any) {
                console.error("Gemini Extraction Failed", e);
                throw new Error(`Gemini Error: ${e.message}`);
            }
        }

        // OpenAI Implementation
        const prompt = `
        Extract job details from the following text into a JSON object.
        Do not include markdown formatting. Return raw JSON only.
        Fields: company, role, location, work_mode (remote/hybrid/onsite/unknown), employment_type (full-time/part-time/contract/intern/temporary/unknown), salary_range, description (summary), responsibilities (array), requirements (array), skills (array).
        
        Text:
        ${text.substring(0, 10000)} 
        `;

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini", // Cost effective
                    messages: [
                        { role: "system", content: "You are a helpful assistant that extracts job details as JSON." },
                        { role: "user", content: prompt }
                    ],
                    response_format: { type: "json_object" }
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'OpenAI API Error');
            }

            const data = await response.json();
            const content = data.choices[0].message.content;
            return JSON.parse(content) as JobData;

        } catch (e: any) {
            console.error("OpenAI Extraction Failed", e);
            throw new Error(`OpenAI Error: ${e.message}`);
        }
    }
}

// --- Service Factory ---
export const aiService = {
    async extract(text: string, preferredProvider: AIProviderType, apiKey?: string): Promise<JobData> {
        let provider: AIProvider;

        if (preferredProvider === 'chrome_builtin') {
            provider = new ChromeBuiltinProvider();
            if (!(await provider.validateAvailability())) {
                // Fallback or error
                throw new Error("Chrome Built-in AI is not available. Please check flags or use an external key.");
            }
        } else {
            if (!apiKey) throw new Error("API Key required for external provider");
            provider = new ExternalProvider(apiKey, preferredProvider === 'external_openai' ? 'openai' : 'gemini');
        }

        return await provider.extractJobDetails(text);
    }
};
