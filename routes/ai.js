const express = require('express');
const router = express.Router();
const OpenAI = require('openai');

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.post('/plot', async (req, res) => {
  try {
    const {
      title,
      issue,
      year,
      publisher,
      characters,
      writer,
      artist,
      key,
      description,
      short,
      existingPlot,
    } = req.body;

    const prompt = `
You help a comic book store write short plot blurbs for their product pages.

Write a clear, engaging plot summary in 50–60 words.
It should read like a back-cover blurb, not a review.
Avoid spoilers beyond the main setup.

Details:
- Title: ${title || 'Unknown'}
- Issue: ${issue || 'n/a'}
- Year: ${year || 'n/a'}
- Publisher: ${publisher || 'n/a'}
- Main characters: ${characters || 'n/a'}
- Writer: ${writer || 'n/a'}
- Artist: ${artist || 'n/a'}
- Key notes: ${key || 'none'}

If there is existing text below, use it as raw material and rewrite/improve it:

Description: ${description || 'n/a'}
Short: ${short || 'n/a'}
Existing plot: ${existingPlot || 'n/a'}
`;

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You write concise, accurate comic book plot summaries.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 180,
    });

    const plot = completion.choices[0]?.message?.content?.trim() || '';

    res.json({ plot });
  } catch (err) {
    console.error('AI plot error:', err);
    res.status(500).json({ error: 'AI plot generation failed' });
  }
});

module.exports = router;
