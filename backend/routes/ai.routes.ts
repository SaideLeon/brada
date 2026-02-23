import express from 'express';
import { getAIClient, ANALYST_MODEL, FALLBACK_MODEL } from '../services/gemini.service';

const router = express.Router();

router.post('/analyze', async (req, res) => {
  try {
    const { prompt, contextFiles, apiKey } = req.body;
    const ai = getAIClient(apiKey);

    const fileContext = contextFiles.map((f: any) => `--- ${f.path} ---\n${f.content}\n`).join("\n");
    
    const fullPrompt = `
      You are an expert Senior Software Engineer and Code Analyst.
      
      Here is the code from a GitHub repository:
      ${fileContext}
      
      ${prompt ? `User Request: ${prompt}` : "Please perform a comprehensive analysis of this codebase."}
      
      Your task:
      1. Summarize the purpose of the project.
      2. Identify the tech stack.
      3. List 3-5 major strengths.
      4. List 3-5 areas for improvement (bugs, security risks, performance, code quality).
      5. If the user asked a specific question, answer it in detail.
      
      IMPORTANT: You MUST respond in Portuguese (pt-BR).
      Format your response in Markdown.
    `;

    try {
      const response = await ai.models.generateContent({
        model: ANALYST_MODEL,
        contents: fullPrompt,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });
      res.json(response);
    } catch (error: any) {
      if (error.status === 429 || error.message?.includes("429")) {
        console.warn("Quota exceeded for Pro model. Falling back to Flash model.");
        const response = await ai.models.generateContent({
          model: FALLBACK_MODEL,
          contents: fullPrompt
        });
        res.json(response);
      } else {
        throw error;
      }
    }
  } catch (error: any) {
    console.error("AI Analysis Error:", error);
    res.status(500).json({ error: error.message || "Failed to analyze code" });
  }
});

router.post('/think', async (req, res) => {
  try {
    const { history, currentInput, context, apiKey } = req.body;
    const ai = getAIClient(apiKey);

    const systemInstruction = `
      You are a thoughtful and rigorous Lead Engineer. 
      When a user suggests an improvement, you must "think quite a lot" about it.
      
      Process:
      1. Analyze the user's suggestion deeply. Consider edge cases, architectural impact, performance, and security.
      2. Formulate a set of clarifying questions to ensure the improvement is well-defined.
      3. Propose a plan or counter-proposal if the suggestion has flaws.
      4. Search for existing solutions, libraries, or YouTube tutorials that could help.
      5. ALWAYS end with a specific question or set of options for the user to confirm before proceeding.
      
      Your goal is to reach a mutual agreement with the user on the best path forward.
      IMPORTANT: You MUST respond in Portuguese (pt-BR).
    `;

    const contents = [
      { role: 'user', parts: [{ text: `Context (Code Summary/Snippet): ${context}` }] },
      ...history.map((h: any) => ({ role: h.role === 'user' ? 'user' : 'model', parts: [{ text: h.content }] })),
      { role: 'user', parts: [{ text: currentInput }] }
    ];

    try {
      const response = await ai.models.generateContent({
        model: ANALYST_MODEL,
        contents,
        config: {
          systemInstruction,
          tools: [{ googleSearch: {} }]
        }
      });
      res.json(response);
    } catch (error: any) {
      if (error.status === 429 || error.message?.includes("429")) {
        console.warn("Quota exceeded for Pro model. Falling back to Flash model.");
        const response = await ai.models.generateContent({
          model: FALLBACK_MODEL,
          contents,
          config: { systemInstruction }
        });
        res.json(response);
      } else {
        throw error;
      }
    }
  } catch (error: any) {
    console.error("AI Thinking Error:", error);
    res.status(500).json({ error: error.message || "Failed to think about request" });
  }
});

router.post('/blueprint', async (req, res) => {
    try {
      const { contextFiles, context, apiKey } = req.body;
      const ai = getAIClient(apiKey);
      
      const fileContext = contextFiles.map((f: any) => `--- ${f.path} ---\n${f.content}\n`).join("\n");
      
      const prompt = `
        You are an elite Software Architect and Technical Lead.
        
        Your task is to generate a comprehensive, explicit, and highly detailed TECHNICAL BLUEPRINT for the provided codebase.
        This blueprint will be used by an AI coding assistant ("vibe code") to refactor, improve, or rebuild the project.
        
        Input Context:
        ${context}
        
        Codebase:
        ${fileContext}
        
        The Blueprint MUST include the following sections (be extremely explicit, no summaries):
        
        # 1. Project Overview & Architecture
        - Exact purpose of the application.
        - Current Architecture Diagram (Mermaid or text description).
        - Data Flow Analysis.
        
        # 2. Tech Stack & Dependencies
        - Core Frameworks (versions).
        - UI Libraries.
        - State Management.
        - External Services/APIs.
        
        # 3. Component Analysis (Deep Dive)
        - List every major component.
        - Analyze props, state, and side effects.
        - Identify anti-patterns or "smells" in specific files.
        
        # 4. Refactoring Strategy (The "Vibe Code" Plan)
        - Step-by-step plan to modernize or fix the code.
        - Specific file renames, moves, or deletions.
        - New directory structure proposal.
        
        # 5. Implementation Guidelines
        - Coding standards (naming conventions, typing rules).
        - Error handling strategy.
        - Testing strategy.
        
        # 6. Explicit Tasks for the AI
        - Task 1: [Actionable instruction]
        - Task 2: [Actionable instruction]
        ...
        
        IMPORTANT: 
        - Do NOT summarize. Be verbose and technical.
        - Respond in Portuguese (pt-BR).
        - Format strictly in Markdown.
      `;
  
      try {
        const response = await ai.models.generateContent({
          model: ANALYST_MODEL,
          contents: prompt,
          config: {
            tools: [{ googleSearch: {} }]
          }
        });
        res.json(response);
      } catch (error: any) {
        if (error.status === 429 || error.message?.includes("429")) {
          console.warn("Quota exceeded for Pro model. Falling back to Flash model.");
          const response = await ai.models.generateContent({
            model: FALLBACK_MODEL,
            contents: prompt
          });
          res.json(response);
        } else {
            throw error;
        }
      }
    } catch (error: any) {
        console.error("Blueprint Generation Error:", error);
        res.status(500).json({ error: error.message || "Failed to generate blueprint" });
    }
  });

export default router;
