# Spec: shelf labels for Wren Street

## Goal

Make one shelf label for each of the 12 recipes. Each label names every allergen in its recipe and shows the shop price.

## Stop condition

Stop when there are 12 files in out/labels/, every item on out/labels-done.md can be ticked, and a person has signed each label.

## Questions and answers

- Q: Who reads the label?
- A: A customer at the shelf, and Jess before it goes out.
- Q: What changed that the old labels miss?
- A: The Multigrain Loaf now has sesame seeds on top.
- Q: Where does the price come from?
- A: From out/price-list-clean.xlsx, not the menu.
- Q: Who signs?
- A: A person. Claude never fills in "Checked by:".
