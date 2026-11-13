---
name: allergen-label
description: Make the shelf label for a Wren Street Bakery product from its recipe, with its price and every allergen. Use when asked for a label, or for allergens on a product.
---

# Allergen label

## Steps

1. Read the recipe in recipes/. The product name is its first line.
2. Read allergens/allergen-list.csv. An allergen is in the product when any of its look_for words is in the
   recipe's Ingredients part. Read every ingredient, including the words in brackets.
3. Find the shop price for the product in out/price-list-clean.xlsx.
4. Write out/labels/<the recipe file name>, in this shape:

```text
# <Product name>

Price: £<price, two decimals>

Contains: <allergens, lower case, comma separated, in the order of allergen-list.csv>

Checked by:
```

