# Order Creation Guide - Billing Service

This guide explains how to create orders with all edge cases, including tax configuration, delivery charges, coupons, and toppings.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Understanding Price Validation](#understanding-price-validation)
3. [Step-by-Step Order Creation](#step-by-step-order-creation)
4. [Configuration Setup](#configuration-setup)
5. [Order Payload Examples](#order-payload-examples)
6. [Common Errors & Solutions](#common-errors--solutions)
7. [Edge Cases](#edge-cases)

---

## Prerequisites

Before creating an order, ensure:

1. **Product exists in billing service** - Products are synced via Kafka from catalog service
2. **User is authenticated** - Valid JWT token required
3. **Tax config exists** (optional) - For tax calculation
4. **Delivery config exists** (optional) - For delivery charges
5. **Coupon exists** (optional) - For discounts

### Check Product Sync

Products must be in the billing service's local MongoDB (synced via Kafka):

```bash
# Check if product exists
mongosh "mongodb://root:root@localhost:27018/billing-service?authSource=admin" \
  --eval "db.products.findOne({_id: 'YOUR_PRODUCT_ID'})"
```

If product doesn't exist, ensure:

- Kafka is running
- Billing service consumer is connected
- Catalog service published the `product-created` event

---

## Understanding Price Validation

The billing service **validates every price** server-side. You cannot submit arbitrary prices.

### What Gets Validated

| Field                | Validation                                                    |
| -------------------- | ------------------------------------------------------------- |
| `items[].totalPrice` | Must match: `(productPrice + toppingsPrice) × qty`            |
| `discount`           | Must match: `subtotal × couponDiscount%`                      |
| `taxTotal`           | Must match: sum of all active taxes                           |
| `deliveryCharge`     | Must match: calculated from delivery tiers                    |
| `total`              | Must match: `subtotal - discount + taxTotal + deliveryCharge` |

### Price Calculation Formula

```
subtotal = Σ(item.totalPrice)  // Sum of all items
discount = subtotal × (coupon.discount / 100)
taxableAmount = subtotal - discount
taxTotal = Σ(taxableAmount × tax.rate / 100)  // Only active taxes
deliveryCharge = based on tier for (subtotal - discount)
total = taxableAmount + taxTotal + deliveryCharge
```

---

## Step-by-Step Order Creation

### Step 1: Get Product Details

First, fetch the product to understand its price configuration:

```
GET /products/{productId}  (from catalog service)
```

Response example:

```json
{
    "_id": "6975e428cd021ed020f85d93",
    "name": "Margherita Pizza",
    "priceConfiguration": {
        "small": {
            "priceType": "base",
            "availableOptions": {
                "small": 10,
                "medium": 15,
                "large": 20
            }
        }
    },
    "tenantId": "3",
    "isPublished": true
}
```

**Important:** The keys in `priceConfiguration` (e.g., `"small"`) and `availableOptions` (e.g., `"small"`, `"medium"`, `"large"`) must match exactly in your order.

### Step 2: Get Tax Configuration (if applicable)

```
GET /taxes?tenantId=3
```

Response:

```json
{
    "taxConfig": {
        "tenantId": "3",
        "taxes": [
            { "name": "CGST", "rate": 9, "isActive": true },
            { "name": "SGST", "rate": 9, "isActive": true }
        ]
    }
}
```

### Step 3: Get Delivery Configuration (if applicable)

```
GET /delivery?tenantId=3
```

Or calculate directly:

```
GET /delivery/calculate?tenantId=3&orderSubTotal=27
```

Response:

```json
{
    "deliveryCharge": 50,
    "isFreeDelivery": false,
    "appliedTier": { "minOrderValue": 0, "deliveryCharge": 50 }
}
```

### Step 4: Verify Coupon (if using)

```
POST /coupons/verify
{
  "code": "enjoy_10",
  "tenantId": "3"
}
```

Response:

```json
{
    "valid": true,
    "coupon": {
        "code": "enjoy_10",
        "discount": 10,
        "validUpto": "2026-12-31"
    }
}
```

### Step 5: Calculate Prices

Example calculation:

```
Product: Margherita Pizza
Option: "small" → "medium" = 15
Quantity: 2

Step 1: Item total
  itemPrice = 15 × 2 = 30

Step 2: Subtotal
  subtotal = 30

Step 3: Discount (10% coupon)
  discount = 30 × 0.10 = 3

Step 4: Taxable Amount
  taxableAmount = 30 - 3 = 27

Step 5: Taxes (CGST 9% + SGST 9%)
  CGST = 27 × 0.09 = 2.43
  SGST = 27 × 0.09 = 2.43
  taxTotal = 4.86

Step 6: Delivery (assuming tier: 0-200 = 50)
  deliveryCharge = 50

Step 7: Final Total
  total = 27 + 4.86 + 50 = 81.86
```

### Step 6: Create Order

```
POST /orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "address": "123 Main Street, City, Country",
  "items": [
    {
      "_id": "6975e428cd021ed020f85d93",
      "name": "Margherita Pizza",
      "image": "https://example.com/pizza.jpg",
      "qty": 2,
      "priceConfiguration": {
        "small": "medium"
      },
      "toppings": [],
      "totalPrice": 30
    }
  ],
  "couponCode": "enjoy_10",
  "discount": 3,
  "taxTotal": 4.86,
  "deliveryCharge": 50,
  "total": 81.86,
  "paymentMode": "upi",
  "tenantId": "3"
}
```

---

## Configuration Setup

### Setting Up Tax Configuration

```
POST /taxes
Authorization: Bearer <admin_or_manager_token>

{
  "taxes": [
    { "name": "CGST", "rate": 9, "isActive": true },
    { "name": "SGST", "rate": 9, "isActive": true }
  ],
  "tenantId": "3"  // Required for Admin, optional for Manager
}
```

### Setting Up Delivery Configuration

```
POST /delivery
Authorization: Bearer <admin_or_manager_token>

{
  "isActive": true,
  "orderValueTiers": [
    { "minOrderValue": 0, "deliveryCharge": 50 },
    { "minOrderValue": 200, "deliveryCharge": 30 },
    { "minOrderValue": 500, "deliveryCharge": 0 }
  ],
  "freeDeliveryThreshold": 1000,
  "tenantId": "3"
}
```

**Tier Logic:**

- Orders < 200: Rs 50 delivery
- Orders 200-500: Rs 30 delivery
- Orders >= 500: Free delivery
- Orders >= 1000: Always free (threshold overrides tiers)

### Creating a Coupon

```
POST /coupons
Authorization: Bearer <admin_or_manager_token>

{
  "title": "Enjoy 10% Off",
  "code": "ENJOY_10",
  "discount": 10,
  "validUpto": "2026-12-31",
  "tenantId": "3"
}
```

---

## Order Payload Examples

### 1. Basic Order (No Tax/Delivery/Coupon)

When tenant has no tax or delivery config:

```json
{
    "address": "123 Main Street",
    "items": [
        {
            "_id": "PRODUCT_ID",
            "name": "Margherita Pizza",
            "image": "https://example.com/pizza.jpg",
            "qty": 2,
            "priceConfiguration": {
                "small": "medium"
            },
            "toppings": [],
            "totalPrice": 30
        }
    ],
    "total": 30,
    "paymentMode": "card",
    "tenantId": "3"
}
```

### 2. Order with Tax Only

```json
{
    "address": "123 Main Street",
    "items": [
        {
            "_id": "PRODUCT_ID",
            "name": "Margherita Pizza",
            "image": "https://example.com/pizza.jpg",
            "qty": 2,
            "priceConfiguration": {
                "small": "medium"
            },
            "toppings": [],
            "totalPrice": 30
        }
    ],
    "taxTotal": 5.4,
    "total": 35.4,
    "paymentMode": "upi",
    "tenantId": "3"
}
```

Calculation: `30 + (30 × 18%) = 30 + 5.4 = 35.4`

### 3. Order with Delivery Only

```json
{
    "address": "123 Main Street",
    "items": [
        {
            "_id": "PRODUCT_ID",
            "name": "Margherita Pizza",
            "image": "https://example.com/pizza.jpg",
            "qty": 2,
            "priceConfiguration": {
                "small": "medium"
            },
            "toppings": [],
            "totalPrice": 30
        }
    ],
    "deliveryCharge": 50,
    "total": 80,
    "paymentMode": "cash",
    "tenantId": "3"
}
```

### 4. Order with Coupon Only

```json
{
    "address": "123 Main Street",
    "items": [
        {
            "_id": "PRODUCT_ID",
            "name": "Margherita Pizza",
            "image": "https://example.com/pizza.jpg",
            "qty": 2,
            "priceConfiguration": {
                "small": "medium"
            },
            "toppings": [],
            "totalPrice": 30
        }
    ],
    "couponCode": "enjoy_10",
    "discount": 3,
    "total": 27,
    "paymentMode": "wallet",
    "tenantId": "3"
}
```

### 5. Full Order (Tax + Delivery + Coupon)

```json
{
    "address": "123 Main Street",
    "items": [
        {
            "_id": "PRODUCT_ID",
            "name": "Margherita Pizza",
            "image": "https://example.com/pizza.jpg",
            "qty": 2,
            "priceConfiguration": {
                "small": "medium"
            },
            "toppings": [],
            "totalPrice": 30
        }
    ],
    "couponCode": "enjoy_10",
    "discount": 3,
    "taxTotal": 4.86,
    "deliveryCharge": 50,
    "total": 81.86,
    "paymentMode": "upi",
    "tenantId": "3"
}
```

**Calculation:**

```
subtotal = 30
discount = 30 × 10% = 3
taxableAmount = 30 - 3 = 27
CGST = 27 × 9% = 2.43
SGST = 27 × 9% = 2.43
taxTotal = 4.86
deliveryCharge = 50 (tier for order value < 200)
total = 27 + 4.86 + 50 = 81.86
```

### 6. Order with Toppings

```json
{
    "address": "456 Oak Avenue",
    "items": [
        {
            "_id": "PRODUCT_ID",
            "name": "Pepperoni Pizza",
            "image": "https://example.com/pepperoni.jpg",
            "qty": 1,
            "priceConfiguration": {
                "small": "large"
            },
            "toppings": [
                {
                    "_id": "TOPPING_ID_1",
                    "name": "Extra Cheese",
                    "image": "https://example.com/cheese.jpg",
                    "price": 5
                },
                {
                    "_id": "TOPPING_ID_2",
                    "name": "Jalapenos",
                    "image": "https://example.com/jalapeno.jpg",
                    "price": 3
                }
            ],
            "totalPrice": 28
        }
    ],
    "total": 28,
    "paymentMode": "card",
    "tenantId": "3"
}
```

**Calculation:** `(20 + 5 + 3) × 1 = 28`

### 7. Multiple Items Order

```json
{
    "address": "789 Pine Road",
    "items": [
        {
            "_id": "PRODUCT_ID_1",
            "name": "Margherita Pizza",
            "image": "https://example.com/margherita.jpg",
            "qty": 2,
            "priceConfiguration": { "small": "medium" },
            "toppings": [],
            "totalPrice": 30
        },
        {
            "_id": "PRODUCT_ID_2",
            "name": "Garlic Bread",
            "image": "https://example.com/garlic.jpg",
            "qty": 1,
            "priceConfiguration": { "size": "regular" },
            "toppings": [],
            "totalPrice": 8
        }
    ],
    "total": 38,
    "paymentMode": "netbanking",
    "tenantId": "3"
}
```

---

## Common Errors & Solutions

### Error: "Price validation failed"

**Causes:**

1. Product doesn't exist in billing service (not synced via Kafka)
2. `totalPrice` doesn't match calculated price
3. `total` doesn't match sum of all components
4. Topping price mismatch
5. Wrong `priceConfiguration` keys

**Solution:** Double-check all calculations and ensure product exists.

### Error: "Product not found: {id}"

**Cause:** Product not synced from catalog service.

**Solution:**

1. Check if Kafka consumer is running
2. Verify product exists in catalog service
3. Check billing service logs for Kafka messages

### Error: "Invalid coupon code"

**Cause:** Coupon doesn't exist for the tenant.

**Solution:** Verify coupon with `POST /coupons/verify`

### Error: "Coupon has expired"

**Cause:** Coupon's `validUpto` date has passed.

**Solution:** Use a valid coupon or remove `couponCode` from request.

### Error: "Invalid configuration key"

**Cause:** `priceConfiguration` key in order doesn't match product.

**Example:**

- Product has: `{ "small": { ... } }`
- Order sends: `{ "Size": "medium" }` ❌
- Should be: `{ "small": "medium" }` ✓

### Error: "Invalid option"

**Cause:** Selected option doesn't exist in product's `availableOptions`.

**Example:**

- Product has: `availableOptions: { "small": 10, "medium": 15 }`
- Order sends: `{ "small": "extra-large" }` ❌

### Error: "Discount mismatch"

**Cause:** Submitted discount doesn't match calculated discount.

**Solution:** Calculate: `discount = subtotal × (coupon.discount / 100)`

### Error: "Tax mismatch"

**Cause:** Submitted `taxTotal` doesn't match calculated taxes.

**Solution:** Calculate: `taxTotal = Σ(taxableAmount × activeRate / 100)`

### Error: "Delivery charge mismatch"

**Cause:** Submitted `deliveryCharge` doesn't match tier-based calculation.

**Solution:** Use `GET /delivery/calculate?tenantId=X&orderSubTotal=Y`

### Error: "Total mismatch"

**Cause:** Final total doesn't match calculation.

**Solution:** `total = taxableAmount + taxTotal + deliveryCharge`

---

## Edge Cases

### 1. No Tax Configuration

If tenant has no tax config, don't send `taxTotal` or send `0`:

```json
{
    "taxTotal": 0,
    "total": 30
}
```

### 2. No Delivery Configuration

If tenant has no delivery config, don't send `deliveryCharge` or send `0`:

```json
{
    "deliveryCharge": 0,
    "total": 30
}
```

### 3. Delivery Disabled

When `isActive: false`, delivery is free:

```json
{
    "deliveryCharge": 0,
    "total": 30
}
```

### 4. Free Delivery (Threshold)

When order value >= `freeDeliveryThreshold`:

```json
{
    "deliveryCharge": 0,
    "total": 1027
}
```

### 5. Multiple Price Configuration Keys

Some products have multiple config keys (e.g., Size + Crust):

**Product:**

```json
{
    "priceConfiguration": {
        "Size": {
            "priceType": "base",
            "availableOptions": { "Small": 10, "Medium": 15, "Large": 20 }
        },
        "Crust": {
            "priceType": "additional",
            "availableOptions": { "Thin": 0, "Thick": 5, "Stuffed": 10 }
        }
    }
}
```

**Order:**

```json
{
    "priceConfiguration": {
        "Size": "Medium",
        "Crust": "Thick"
    },
    "totalPrice": 20 // 15 + 5 = 20
}
```

### 6. Role-Based Tenant Requirements

| Role     | tenantId in Request                      |
| -------- | ---------------------------------------- |
| Admin    | **Required** - must specify which tenant |
| Manager  | **Not needed** - uses JWT tenant         |
| Customer | **Required** - must specify which tenant |

### 7. Floating Point Precision

The server allows 0.01 tolerance for floating point:

```javascript
if (Math.abs(calculated - submitted) > 0.01) {
    // Error
}
```

Round your values to 2 decimal places.

---

## Quick Reference

### Payment Modes

- `card`
- `cash`
- `upi`
- `netbanking`
- `wallet`

### Order Statuses

- `pending` (initial)
- `confirmed`
- `preparing`
- `out_for_delivery`
- `delivered`
- `cancelled`

### Required Fields

- `address` - Delivery address (string)
- `items` - Array of order items (min 1)
- `total` - Final order total (number)
- `paymentMode` - One of the valid modes
- `tenantId` - Required for Admin and Customer

### Optional Fields

- `couponCode` - Valid coupon code
- `discount` - Calculated discount amount
- `taxTotal` - Calculated tax total
- `deliveryCharge` - Calculated delivery charge

---

## Checklist Before Creating Order

- [ ] Product exists in billing service (synced via Kafka)
- [ ] Product `isPublished` is `true`
- [ ] Product belongs to the correct `tenantId`
- [ ] `priceConfiguration` keys match exactly
- [ ] `availableOptions` values match exactly
- [ ] Topping prices match database
- [ ] Coupon is valid and not expired
- [ ] Tax calculation uses only active taxes
- [ ] Delivery charge matches the correct tier
- [ ] Final total is calculated correctly
- [ ] All amounts rounded to 2 decimal places
