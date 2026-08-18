import { createContext, useContext, useMemo, useState } from "react";
import { caregivers } from "./data.js";

const Store = createContext(null);

export function StoreProvider({ children }) {
  const [zip, setZip] = useState("10025");
  const [cart, setCart] = useState([]);
  const [order, setOrder] = useState(null);
  const [role, setRole] = useState("family");
  const [wallet, setWallet] = useState(184.5);
  const [lineTickets, setLineTickets] = useState([
    {
      id: "t-441",
      when: "Today · 4:00–8:00p",
      who: "Eleanor V., 78 · 2.1 mi",
      items: "Morning ADLs + meals",
      pay: 74,
      status: "new",
    },
    {
      id: "t-442",
      when: "Tomorrow · 7:00–11:00a",
      who: "Harold M., 84 · 0.8 mi",
      items: "Post-hospital week",
      pay: 96,
      status: "new",
    },
  ]);

  const value = useMemo(
    () => ({
      zip,
      setZip,
      cart,
      role,
      setRole,
      order,
      wallet,
      lineTickets,
      addToCart(caregiver, item) {
        setCart((prev) => {
          const existing = prev.find((row) => row.itemId === item.id && row.caregiverId === caregiver.id);
          if (existing) {
            return prev.map((row) =>
              row === existing ? { ...row, qty: row.qty + 1 } : row
            );
          }
          return [
            ...prev,
            {
              key: `${caregiver.id}-${item.id}-${Date.now()}`,
              caregiverId: caregiver.id,
              caregiverName: caregiver.name,
              neighborhood: caregiver.neighborhood,
              itemId: item.id,
              name: item.name,
              desc: item.desc,
              price: item.price,
              minutes: item.minutes,
              qty: 1,
            },
          ];
        });
      },
      removeFromCart(key) {
        setCart((prev) => prev.filter((row) => row.key !== key));
      },
      clearCart() {
        setCart([]);
      },
      placeOrder() {
        if (!cart.length) return null;
        const caregiver = caregivers.find((c) => c.id === cart[0].caregiverId);
        const placed = {
          id: `K-${Math.floor(1000 + Math.random() * 9000)}`,
          placedAt: Date.now(),
          zip,
          caregiver,
          lines: cart,
          subtotal: cart.reduce((s, r) => s + r.price * r.qty, 0),
          medicaidCovered: true,
          status: "accepted",
        };
        setOrder(placed);
        setCart([]);
        return placed;
      },
      advanceOrder() {
        setOrder((prev) => {
          if (!prev) return prev;
          const next =
            prev.status === "accepted"
              ? "enroute"
              : prev.status === "enroute"
                ? "invisit"
                : prev.status === "invisit"
                  ? "paid"
                  : "paid";
          if (next === "paid" && prev.status !== "paid") {
            setWallet((w) => w + prev.subtotal);
          }
          return { ...prev, status: next };
        });
      },
      acceptTicket(id) {
        setLineTickets((prev) =>
          prev.map((t) => (t.id === id ? { ...t, status: "on-the-line" } : t))
        );
      },
      closeTicket(id) {
        const ticket = lineTickets.find((t) => t.id === id);
        setLineTickets((prev) => prev.filter((t) => t.id !== id));
        if (ticket) setWallet((w) => w + ticket.pay);
      },
    }),
    [zip, cart, role, order, wallet, lineTickets]
  );

  return <Store.Provider value={value}>{children}</Store.Provider>;
}

export function useStore() {
  const ctx = useContext(Store);
  if (!ctx) throw new Error("useStore outside provider");
  return ctx;
}
