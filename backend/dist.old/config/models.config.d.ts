export declare const modelsConfig: {
    providers: {
        ollama: {
            endpoint: string;
            models: {
                general: {
                    name: string;
                    capabilities: string[];
                    contextLength: number;
                };
                coding: {
                    name: string;
                    capabilities: string[];
                    contextLength: number;
                };
                fast: {
                    name: string;
                    capabilities: string[];
                    contextLength: number;
                };
            };
        };
        groq: {
            endpoint: string;
            apiKey: string | undefined;
            models: {
                large: {
                    name: string;
                    capabilities: string[];
                    contextLength: number;
                };
            };
        };
        mistral: {
            endpoint: string;
            apiKey: string | undefined;
            models: {
                coding: {
                    name: string;
                    capabilities: string[];
                    contextLength: number;
                };
            };
        };
    };
    defaultModel: string;
    agentModelMapping: {
        director: string;
        codeSpecialist: string;
        generalSpecialist: string;
    };
};
