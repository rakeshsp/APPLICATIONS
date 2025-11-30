export const AI_PROVIDERS = {
    GEMINI: 'gemini',
    OPENAI: 'openai',
};

export async function generateImpression(reportText, settings) {
    if (!settings.apiKey) {
        throw new Error("API Key is missing. Please check your settings.");
    }

    const prompt = `
    You are an expert radiologist assistant. 
    Based on the following MRI/CT findings, write a concise, professional "Impression" section for the report.
    
    Rules:
    - Focus on the abnormal findings.
    - Use standard radiological terminology.
    - Do not repeat the detailed findings, just summarize the impression.
    - If everything is normal, state "No acute abnormality."
    - Number the points if there are multiple distinct findings.

    Findings:
    ${reportText}
  `;

    if (settings.provider === AI_PROVIDERS.GEMINI) {
        return callGemini(prompt, settings.apiKey);
    } else if (settings.provider === AI_PROVIDERS.OPENAI) {
        return callOpenAI(prompt, settings.apiKey);
    } else {
        throw new Error("Invalid AI Provider selected.");
    }
}

async function callGemini(prompt, apiKey) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to fetch from Gemini");
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

async function callOpenAI(prompt, apiKey) {
    const url = "https://api.openai.com/v1/chat/completions";

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to fetch from OpenAI");
    }

    const data = await response.json();
    return data.choices[0].message.content;
}
