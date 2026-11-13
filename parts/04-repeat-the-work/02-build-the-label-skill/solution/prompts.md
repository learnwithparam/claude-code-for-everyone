# How Claude made this answer

Claude Code wrote the skill and made the labels with it. The labels come from a real Claude Code run, saved in `world/recordings/close-1`.

## The prompts you type

```text
Make a skill at .claude/skills/allergen-label/SKILL.md that makes a shelf
label for one product. Give it a name and a description that says it is
for labels. Add a "## Steps" part: read the recipe, find each allergen
with allergens/allergen-list.csv, take the shop price from
out/price-list-clean.xlsx, and write out/labels/<recipe file name>
with the lines Price:, Contains: and an empty "Checked by:".
Add a "## Never" part: never fill in "Checked by:", and never copy
the old label in labels/.
```

Then:

```text
/allergen-label Use it for all 12 recipes.
```

## What Claude showed

Claude showed the skill first. Then it ran the skill for each recipe and asked before it wrote each label. On the Multigrain Loaf, it said the old label has no sesame, but the recipe does.

## What you checked before you said yes

- The description says when to use it: for a label, or for allergens on a product.
- The Never part says Claude never signs a label.
- `out/labels/multigrain-loaf.md` says gluten, sesame, soya.
- `out/labels/sourdough-loaf.md` says £4.20, from the clean price list.

## What you would say no to

- A label copied from the old one in `labels/`. It misses sesame. Say no.
- A price from the wall menu, like £4.00 for the Sourdough Loaf. Say no.
- A skill with no Never part. Ask Claude to add one.

Then run `bun run verify build-the-label-skill`. All 8 rules pass.
