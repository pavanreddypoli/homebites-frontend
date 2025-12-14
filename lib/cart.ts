// lib/cart.ts

export type LegacyCartItem = {
  dish_id: number;
  name: string;
  price: number;
  quantity: number;
  restaurant_id?: string;
};

export type CartItem = {
  dish_id: number;
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
};

export type Cart = {
  restaurant_id: string;
  restaurant_name?: string;
  items: CartItem[];
};

const CART_KEY = "homebites_cart";

/**
 * Backward compatible cart getter.
 * - If cart is stored as legacy array, it migrates to object format.
 * - Object format is required by CartDrawer.
 */
export function getCart(): Cart | null {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(CART_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);

    // ✅ New format: { restaurant_id, restaurant_name, items: [] }
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.items)) {
      if (!parsed.restaurant_id) return null;
      return parsed as Cart;
    }

    // ✅ Legacy format: []
    if (Array.isArray(parsed)) {
      const legacy: LegacyCartItem[] = parsed;
      if (!legacy.length) return null;

      const restaurant_id = legacy[0]?.restaurant_id || "";
      const migrated: Cart = {
        restaurant_id,
        restaurant_name: undefined,
        items: legacy.map((i) => ({
          dish_id: i.dish_id,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
        })),
      };

      // Store migrated version (best-effort)
      if (restaurant_id) {
        saveCart(migrated);
        return migrated;
      }

      // If legacy didn’t store restaurant_id, still return a cart-like object
      return migrated.items.length ? migrated : null;
    }

    return null;
  } catch {
    return null;
  }
}

export function saveCart(cart: Cart) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

export function clearCart() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CART_KEY);
}

export function getCartSubtotal(): number {
  const cart = getCart();
  if (!cart?.items?.length) return 0;
  return cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
}

export function getCartItemCount(): number {
  const cart = getCart();
  if (!cart?.items?.length) return 0;
  return cart.items.reduce((sum, i) => sum + (i.quantity || 0), 0);
}

export function updateItemQuantity(dish_id: number, quantity: number) {
  const cart = getCart();
  if (!cart) return;

  const nextItems = cart.items
    .map((i) => (i.dish_id === dish_id ? { ...i, quantity } : i))
    .filter((i) => i.quantity > 0);

  if (nextItems.length === 0) {
    clearCart();
    return;
  }

  saveCart({ ...cart, items: nextItems });
}

/**
 * Add to cart with single-restaurant constraint.
 * Returns:
 * - blocked: true if cart has different restaurant
 */
export function addToCart(params: {
  restaurant_id: string;
  restaurant_name?: string;
  dish: { id: number; name: string; price: number; image_url?: string };
  quantity?: number;
}): { cart: Cart | null; blocked: boolean } {
  const { restaurant_id, restaurant_name, dish, quantity = 1 } = params;

  const existing = getCart();

  // 🚫 Block adding from multiple restaurants
  if (existing && existing.restaurant_id && existing.restaurant_id !== restaurant_id) {
    return { cart: existing, blocked: true };
  }

  const cart: Cart = existing || {
    restaurant_id,
    restaurant_name,
    items: [],
  };

  // ensure restaurant_name is set if we have it
  if (!cart.restaurant_name && restaurant_name) cart.restaurant_name = restaurant_name;

  const found = cart.items.find((i) => i.dish_id === dish.id);

  if (found) {
    found.quantity += quantity;
  } else {
    cart.items.push({
      dish_id: dish.id,
      name: dish.name,
      price: dish.price,
      quantity,
      image_url: dish.image_url,
    });
  }

  saveCart(cart);
  return { cart, blocked: false };
}
