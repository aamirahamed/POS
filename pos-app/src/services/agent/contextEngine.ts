import { useLifeMapStore } from "@/store/useLifeMapStore";
import { useFinanceStore } from "@/store/useFinanceStore";
import { useProfileStore } from "@/store/useProfileStore";
import { supabase } from "@/lib/supabase";

export interface UnifiedContext {
    markdown: string;
    metrics: {
        totalLiquidity: number;
        avgMonthlySpending: number;
        financialRunwayMonths: number;
    };
}

export async function compileUnifiedContext(): Promise<UnifiedContext> {
    // 1. Static Strategy Memo (MENTOR.md)
    let mentorMemo = "";
    try {
        const res = await fetch('/MENTOR.md');
        if (res.ok) {
            mentorMemo = await res.text();
        }
    } catch (e) {
        console.warn("Could not load MENTOR.md profile memo", e);
    }

    // 2. Dynamic Cloud Memory (From mentor store / DB)
    let cloudMemory = "";
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase
                .from('mentor_profile_memory')
                .select('content')
                .eq('user_id', user.id)
                .maybeSingle();
            if (data) {
                cloudMemory = data.content;
            }
        }
    } catch (e) {
        console.warn("Could not load cloud profile memory", e);
    }

    // 3. Life Map Tree Structure
    const { nodes } = useLifeMapStore.getState();
    const outlineText = nodes.map(n => {
        const parent = n.data?.parentId ? ` (parent ID: "${n.data.parentId}")` : '';
        let extra = '';
        if (n.data?.resources && n.data.resources.length > 0) {
            extra += `\n    - Resources: ${n.data.resources.map(r => `[${r.title}](${r.url})`).join(', ')}`;
        }
        if (n.data?.canvases && n.data.canvases.length > 0) {
            extra += `\n    - Canvases: ${n.data.canvases.map(c => c.title).join(', ')}`;
        }
        if (n.data?.tasks && n.data.tasks.length > 0) {
            extra += `\n    - Tasks: ${n.data.tasks.map(t => `${t.text} (${t.completed ? 'Done' : 'Todo'})`).join(', ')}`;
        }
        return `- [${n.type.toUpperCase()}] ID: "${n.id}", Label: "${n.data?.label}"${parent}${extra}`;
    }).join('\n');

    // 4. Structured Facts
    const { facts } = useProfileStore.getState();
    const factsText = Object.keys(facts).length > 0 
        ? Object.entries(facts).map(([k, v]) => `- **${k}**: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join('\n')
        : "No structured profile facts registered.";

    // 5. Finance Metrics (Liquidity, Spending, Runway)
    const { bankAccounts, transactions } = useFinanceStore.getState();
    
    // Total Liquidity
    const totalLiquidity = bankAccounts.reduce((acc, account) => acc + (account.balance || 0), 0);

    // Average Monthly Spending (debit transactions over the log duration)
    // Filter debit transactions (amount < 0 and is not a transfer to savings)
    const spendingTx = transactions.filter(t => t.amount < 0);
    
    let avgMonthlySpending = 0;
    let financialRunwayMonths = 999; // Default to a safe large number if no spending

    if (spendingTx.length > 0) {
        // Find date range
        const dates = spendingTx.map(t => new Date(t.date).getTime());
        const maxDate = Math.max(...dates);
        const minDate = Math.min(...dates);
        const durationDays = Math.max(1, (maxDate - minDate) / (1000 * 60 * 60 * 24));
        
        const totalSpending = Math.abs(spendingTx.reduce((acc, t) => acc + t.amount, 0));
        const dailySpending = totalSpending / durationDays;
        avgMonthlySpending = dailySpending * 30.4; // Average days per month

        if (avgMonthlySpending > 0) {
            financialRunwayMonths = totalLiquidity / avgMonthlySpending;
        }
    }

    // Render markdown block
    const markdown = `
# AAMIR'S PROFILE CONTEXT (UNIFIED BRAN STATE)

## 1. STRATEGIC MEMO (MENTOR.md)
${mentorMemo || "No static strategy memo configured."}

## 2. DYNAMIC MEMORY
${cloudMemory || "No dynamic profile memory registered."}

## 3. STRUCTURED LIFE FACTS
${factsText}

## 4. FINANCIAL RUNWAY AUDIT
- **Total Cash Liquidity**: $${totalLiquidity.toFixed(2)} AUD
- **Average Monthly Burn Rate**: $${avgMonthlySpending.toFixed(2)} AUD/month
- **Estimated Runway Capacity**: ${financialRunwayMonths === 999 ? "Unlimited/No spending log" : `${financialRunwayMonths.toFixed(1)} months`}

## 5. ACTIVE LIFE MAP OUTLINE
${outlineText || "No active projects or milestones in life map."}
`;

    return {
        markdown,
        metrics: {
            totalLiquidity,
            avgMonthlySpending,
            financialRunwayMonths
        }
    };
}
