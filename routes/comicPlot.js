// routes/comicPlot.js
const express = require('express');
const router = express.Router();
const OpenAI = require('openai');

const Comicbook = require('../models/Comicbook'); // your existing model
const ClzComic = require('../models/ClzComic');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// simple helper to normalize publisher-ish strings
function normPub(p) {
  return (p || '')
    .toLowerCase()
    .replace(/comics?/g, '')
    .replace(/entertainment/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// GET /comics/:id/clz-plot
router.get('/:id/clz-plot', async (req, res) => {
  try {
    const id = req.params.id;
    const comic = await Comicbook.findByPk(id);

    if (!comic) {
      return res.status(404).json({ error: 'Comic not found' });
    }

    const issue = comic.issue || '';
    const year = comic.year || '';
    const pub = normPub(comic.publisher);

    if (!issue || !year || !pub) {
      return res.status(404).json({ error: 'Not enough data to match CLZ record' });
    }

    // Grab candidates with same issue + year first
    const candidates = await ClzComic.findAll({
      where: {
        issue: issue,
        year: year,
      },
      limit: 20,
    });

    if (!candidates.length) {
      return res.status(404).json({ error: 'No CLZ candidates found' });
    }

    // Score by how close the publisher matches
    let best = null;
    let bestScore = -1;

    for (const cand of candidates) {
      const candPub = normPub(cand.publisher);
      let score = 0;

      if (candPub === pub) score += 3;
      if (candPub.includes(pub) || pub.includes(candPub)) score += 2;

      // small title hint
      const cTitle = (cand.title || '').toLowerCase();
      const myTitle = (comic.title || '').toLowerCase();
      if (cTitle && myTitle && (cTitle.includes(myTitle) || myTitle.includes(cTitle))) {
        score += 1;
      }

      if (score > bestScore) {
        bestScore = score;
        best = cand;
      }
    }

    if (!best || !best.story) {
      return res.status(404).json({ error: 'No CLZ story / plot found for this comic' });
    }

    res.json({
      plot: best.story,
      clzTitle: best.title,
      clzPublisher: best.publisher,
      clzYear: best.year,
    });
  } catch (err) {
    console.error('CLZ plot lookup error:', err);
    res.status(500).json({ error: 'CLZ plot lookup failed' });
  }
});

// POST /comics/:id/ai-plot
router.post('/:id/ai-plot', async (req, res) => {
  try {
    const id = req.params.id;
    const { useClzIfEmpty = true, overwrite = false } = req.body || {};

    const comic = await Comicbook.findByPk(id);

    if (!comic) {
      return res.status(404).json({ error: 'Comic not found' });
    }

    // source text priority:
    // 1) existing comic.plot (if not empty, unless overwrite is true)
    // 2) CLZ story
    // 3) description / short

    let sourcePlot = comic.plot || '';

    if (!sourcePlot || overwrite) {
      let clzStory = '';
      if (useClzIfEmpty) {
        const issue = comic.issue || '';
        const year = comic.year || '';
        const pub = normPub(comic.publisher);

        if (issue && year && pub) {
          const candidates = await ClzComic.findAll({
            where: { issue, year },
            limit: 20,
          });

          let best = null;
          let bestScore = -1;

          for (const cand of candidates) {
            const candPub = normPub(cand.publisher);
            let score = 0;

            if (candPub === pub) score += 3;
            if (candPub.includes(pub) || pub.includes(candPub)) score += 2;

            const cTitle = (cand.title || '').toLowerCase();
            const myTitle = (comic.title || '').toLowerCase();
            if (cTitle && myTitle && (cTitle.includes(myTitle) || myTitle.includes(cTitle))) {
              score += 1;
            }

            if (score > bestScore) {
              bestScore = score;
              best = cand;
            }
          }

          if (best && best.story) {
            clzStory = best.story;
          }
        }
      }

      sourcePlot = sourcePlot || clzStory || comic.description || comic.short || '';
    }

    if (!sourcePlot) {
      return res.status(400).json({ error: 'No source text available to generate plot' });
    }

    const prompt = `
You help a comic shop write short plot blurbs for product listings.

Write a clear, engaging plot summary in 50–60 words.
It should read like a back-cover blurb, not a review.
Avoid hard spoilers beyond the main setup.

Comic details:
- Title: ${comic.title || 'Unknown'}
- Issue: ${comic.issue || 'n/a'}
- Year: ${comic.year || 'n/a'}
- Publisher: ${comic.publisher || 'n/a'}
- Characters: ${comic.characters || 'n/a'}
- Key notes: ${comic.key || 'none'}

Source text from CLZ/database (clean this up and condense it):
${sourcePlot}
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You write concise, accurate comic book plot summaries.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 180,
    });

    const plot = completion.choices?.[0]?.message?.content?.trim() || '';

    if (!plot) {
      return res.status(500).json({ error: 'AI did not return a plot' });
    }

    // save back into comicbooks
    comic.plot = plot;
    await comic.save();

    res.json({ plot });
  } catch (err) {
    console.error('AI plot generation error:', err);
    res.status(500).json({ error: 'AI plot generation failed' });
  }
});

module.exports = router;
