import { json, type RequestHandler } from '@sveltejs/kit';
import { GoogleGenAI } from '@google/genai';
import { env } from '$env/dynamic/private';



function extractBullets(resumeText: string): string[] {
  const lines = resumeText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  let bullets = lines
    .filter((line) => /^[-•*]\s+/.test(line))
    .map((line) => line.replace(/^[-•*]\s+/, ''));

  if (bullets.length === 0) {
    bullets = lines.filter((line) => line.length > 30);
  }

  if (bullets.length === 0) {
    bullets = resumeText
      .split(/[.\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 30);
  }

  return bullets.slice(0, 20);
}

type Tone = 'friendly' | 'professional' | 'savage' | 'sarcastic';


interface RoastRequest {
  resumeText: string;
  tone: Tone;
}

function getGeminiText(result: any): string {
  const parts = result?.candidates?.[0]?.content?.parts;
  if (!parts || !Array.isArray(parts)) return '';
  return parts.map((p: any) => p?.text ?? '').join('').trim();
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body: RoastRequest = await request.json();
    const { resumeText, tone } = body;

    if (!resumeText || resumeText.length < 100) {
      return json(
        { error: 'resumeText is required and should be at least 100 characters long.' },
        { status: 400 }
      );
    }

    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      // This is the exact issue your log shows
      return json(
        { error: 'Missing GEMINI_API_KEY. Make sure it is set in .env.local and you restarted the dev server.' },
        { status: 500 }
      );
    }

    // Create client inside handler so module doesn't crash on import
    const ai = new GoogleGenAI({ apiKey });

    const bullets = extractBullets(resumeText);

    const toneMap: Record<Tone, string> = {
      friendly: 'a light-hearted and humorous tone, like a friend roasting another friend.',
      professional: 'a witty but respectful tone, like a roast at a corporate event.',
      savage: 'a brutally honest and cutting tone, like a roast at a comedy roast battle except it is not friendly and people are hurting feelings and you are enemy.',
      sarcastic: 'a dry and mocking tone, like a roast from a sarcastic friend who hates you secretly.'
    };

    const prompt = `You are a senior recruiter who has viewed 10,000 resumes. You are very cranky and overworked and are super critical of all resumes you see. 
${toneMap[tone]}
Rules: 
- roast only the resume content not the person 
- no hate speech or profanity
- Give specific feedback on how to improve the resume for each section (experience, education, skills, etc)
- The output should be for each section followed by bullet points of roasts for that section and then the suggestions for improvement.
- For each section give a heading and make sure the heading is bold so its easier to read.
            
Resume: ${resumeText}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    const roast = getGeminiText(response);

    return json({ bullets, roast });
    
  } catch (error) {
    console.error('Error generating roast:', error);
    return json(
      { error: 'An error occurred while generating the roast.', detail: String(error) },
      { status: 500 }
    );
  }
};