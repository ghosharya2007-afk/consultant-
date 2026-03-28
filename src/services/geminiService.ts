import { GoogleGenAI, Type } from "@google/genai";
import { User, Goal, Task, CareerPath } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const geminiService = {
  async discoverGoals(user: User, answers: string[]): Promise<CareerPath[]> {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `User Profile:
- Age: ${user.age}
- Education: ${user.education}
- Income: ₹${user.income}/month
- Free Time: ${user.free_time} hours/day
- Answers to discovery questions: ${answers.join(", ")}

Suggest 3 realistic, low-cost career paths for this user. 
For each path, also provide a "google_project_prompt" which is a high-level, challenging project idea (Google-style) that would prove their expertise in this field.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              why: { type: Type.STRING },
              google_project_prompt: { type: Type.STRING },
            },
            required: ["title", "description", "why", "google_project_prompt"],
          },
        },
      },
    });

    return JSON.parse(response.text || "[]");
  },

  async generateWeeklyTasks(user: User, goal: Goal, weekNumber: number, previousTasks: Task[]): Promise<Partial<Task>[]> {
    const previousContext = previousTasks.length > 0 
      ? `Previous week tasks and status: ${previousTasks.map(t => `${t.title} (${t.status}${t.blocker_reason ? `: ${t.blocker_reason}` : ''})`).join(", ")}`
      : "This is the first week.";

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `User Profile:
- Age: ${user.age}
- Education: ${user.education}
- Income: ₹${user.income}/month
- Free Time: ${user.free_time} hours/day
- Goal: ${goal.title} - ${goal.description}
- Week Number: ${weekNumber}
- ${previousContext}

Generate EXACTLY 3 actionable tasks for the upcoming week. 
Constraints:
1. Use ONLY free learning resources.
2. Each task must fit within the user's daily free time (${user.free_time} hours).
3. Provide a clear "reason" why this task is appropriate now.
4. For each task, suggest ONE specific YouTube channel name for learning.
5. For each task, suggest ONE specific GitHub project idea (small and relevant).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              time_required: { type: Type.STRING },
              reason: { type: Type.STRING },
              youtube_recommendation: { type: Type.STRING },
              github_idea: { type: Type.STRING },
            },
            required: ["title", "description", "time_required", "reason", "youtube_recommendation", "github_idea"],
          },
        },
      },
    });

    return JSON.parse(response.text || "[]");
  },

  async getSkillGapSnapshot(user: User, goal: Goal): Promise<string> {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Provide a concise (max 100 words) skill-gap snapshot for a ${user.age}-year-old with ${user.education} background aiming for: ${goal.title}. Focus on what they need to learn first using free resources.`,
    });
    return response.text || "No snapshot available.";
  }
};
