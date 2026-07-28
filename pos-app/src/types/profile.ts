export interface UserFact {
    id: string;
    user_id: string;
    fact_key: string;
    fact_value: any;
    updated_at: string;
    created_at: string;
}

export interface ProfileState {
    facts: Record<string, any>;
    isLoading: boolean;
    loadFacts: () => Promise<void>;
    updateFact: (key: string, value: any) => Promise<void>;
    deleteFact: (key: string) => Promise<void>;
}
