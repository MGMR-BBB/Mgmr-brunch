import "./storage.js";
import React, { useState, useEffect, useMemo } from "react";
import {
  Leaf,
  Heart,
  ShoppingBag,
  Clock,
  Check,
  ArrowLeft,
  Minus,
  Plus,
  Settings,
  Save,
  Loader2,
  Phone,
  CircleDollarSign,
  ListChecks,
  Copy,
  Trash2,
  Lock,
} from "lucide-react";

// Code PIN pour protéger l'accès à l'écran admin (menu de la semaine,
// commandes du jour). Seule la personne qui connaît ce code peut y entrer.
const ADMIN_PIN = "1208";

// Canal de notification push (app ntfy.sh) — une notification est envoyée
// à ce canal à chaque nouvelle commande confirmée.
const NTFY_TOPIC = "mgmr-brunch82-cmd9k2";

// ---------------------------------------------------------------------------
// Les 5 formules : structure et prix FIXES (ne changent pas).
// Seul le contenu (liste d'ingrédients) change chaque semaine via l'admin.
// ---------------------------------------------------------------------------
const FORMULAS = [
  {
    id: "enfant",
    name: "Box Enfant",
    price: 10,
    people: "1 enfant",
    emoji: "👧",
    defaultItems: ["Mini sandwich", "Mini pancakes", "Cake maison", "Dessert gourmand"],
  },
  {
    id: "solo",
    name: "Box 1 personne",
    price: 15,
    people: "1 personne",
    emoji: "🏄",
    defaultItems: [
      "Bagel garni",
      "Sandwich",
      "Mini pancakes",
      "Dessert gourmand",
      "Assortiment de charcuteries",
      "Assortiment de fromages",
    ],
  },
  {
    id: "duo",
    name: "Box 2 personnes",
    price: 28,
    people: "2 personnes",
    emoji: "🫶",
    defaultItems: [
      "Bagel garni",
      "Sandwich",
      "Mini pancakes",
      "Cakes maison",
      "Dessert gourmand",
      "Assortiment de charcuteries",
      "Assortiment de fromages",
    ],
  },
  {
    id: "apero",
    name: "Box Apéro",
    price: 28,
    people: "2-3 personnes",
    emoji: "🥳",
    defaultItems: [
      "Charcuterie : jambon, rosette, chorizo",
      "Fromage",
      "Bruschetta pesto tomate",
      "Légumes",
      "Houmous",
      "Pain & gressins",
      "Olives",
      "Melon, orange et fraise",
    ],
  },
  {
    id: "bigbox",
    name: "BigBox Apéro",
    price: 35,
    people: "4 personnes",
    emoji: "🔥",
    defaultItems: [
      "Mini burgers",
      "Brie & olives",
      "Houmous",
      "Bretzels",
      "Charcuterie fine",
      "Plateau de fromages",
      "Crudités",
      "Pain & crackers",
    ],
  },
  {
    id: "coupedumonde",
    name: "Box Coupe du Monde",
    price: 30,
    people: "2 personnes",
    emoji: "⚽",
    eventDate: "2026-07-14",
    eventSlots: ["18h30", "18h50", "19h10", "19h30", "19h50", "20h10", "20h30"],
    badge: "14 juillet 🎆",
    defaultItems: [
      "À définir — modifiable via l'admin",
    ],
  },
];

// Date de l'événement Coupe du Monde (14 juillet 2026)
const COUPE_DU_MONDE_DATE = "2026-07-14";

// Fenêtre de réservation Coupe du Monde : lundi 7 juillet 8h → dimanche 13 juillet 21h
const CDM_RESERVATION_START = new Date("2026-07-07T08:00:00");
const CDM_RESERVATION_END   = new Date("2026-07-13T21:00:00");

// Retourne true si on est dans la fenêtre de réservation Coupe du Monde
function isCDMReservationOpen() {
  const now = new Date();
  return now >= CDM_RESERVATION_START && now <= CDM_RESERVATION_END;
}

// Vérifie si la box Coupe du Monde est encore disponible (avant ou le jour J)
function isCoupeDuMondeActive() {
  const today = new Date().toISOString().slice(0, 10);
  return today <= COUPE_DU_MONDE_DATE;
}

const STORAGE_KEY = "weekly-menu-content";

// Créneaux horaires fixes toutes les 20 min, retrait 9h30 à 11h (cf. flyer)
const TIME_SLOTS = (() => {
  const slots = [];
  let h = 9, m = 30;
  while (h < 11 || (h === 11 && m === 0)) {
    slots.push(`${String(h).padStart(2, "0")}h${m === 0 ? "00" : m}`);
    m += 20;
    if (m >= 60) { m -= 60; h += 1; }
  }
  return slots;
})();

// Nombre maximum de box au total, tous créneaux confondus, pour le dimanche en cours.
const WEEKLY_BOX_LIMIT = 8;

// Calcule la date (format YYYY-MM-DD) du tout prochain dimanche.
// Si on est déjà dimanche, c'est aujourd'hui.
function getNextSunday() {
  const today = new Date();
  const day = today.getDay(); // 0 = dimanche
  const daysUntilSunday = (7 - day) % 7;
  const d = new Date(today);
  d.setDate(today.getDate() + daysUntilSunday);
  return { iso: d.toISOString().slice(0, 10), date: d };
}

function formatSundayLabel(date) {
  const formatted = date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

// Fenêtre de commande : ouverte du dimanche 12h00 au jeudi 18h00.
// JS getDay() : 0 = dimanche, 1 = lundi, ..., 4 = jeudi, ..., 6 = samedi.
function getOrderWindowStatus() {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const totalMinutes = hour * 60 + minute;

  let isOpen;
  if (day === 0) {
    // Dimanche : ouvert à partir de 12h00
    isOpen = totalMinutes >= 12 * 60;
  } else if (day >= 1 && day <= 3) {
    // Lundi, mardi, mercredi : toute la journée
    isOpen = true;
  } else if (day === 4) {
    // Jeudi : ouvert jusqu'à 18h00
    isOpen = totalMinutes < 18 * 60;
  } else {
    // Vendredi, samedi : fermé
    isOpen = false;
  }

  // Calcule la prochaine réouverture (le dimanche suivant à 12h00) pour l'afficher si fermé.
  const daysUntilSunday = (7 - day) % 7;
  const nextOpening = new Date(now);
  nextOpening.setDate(now.getDate() + (daysUntilSunday === 0 && !isOpen ? 7 : daysUntilSunday));
  nextOpening.setHours(12, 0, 0, 0);

  return { isOpen, nextOpening };
}

// ---------------------------------------------------------------------------
// Motif décoratif "tampon" inspiré du logo
// ---------------------------------------------------------------------------
function StampRing({ size = 120, children }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="absolute inset-0" style={{ width: size, height: size }}>
        <circle cx="50" cy="50" r="46" fill="none" stroke="#C97B63" strokeWidth="1.2" strokeDasharray="2 3" />
      </svg>
      <div className="relative flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

function SectionEyebrow({ children }) {
  return (
    <div className="flex items-center gap-2 justify-center text-[#5B6B4F]">
      <span className="h-px w-6 bg-[#5B6B4F]/40" />
      <span className="text-xs tracking-[0.2em] uppercase font-medium">{children}</span>
      <span className="h-px w-6 bg-[#5B6B4F]/40" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Écran Menu (vitrine client)
// ---------------------------------------------------------------------------
function MenuScreen({ cart, weeklyContent, onAdd, onRemove, onGoCart, onOpenAdmin, orderWindow }) {
  const totalCount = useMemo(() => Object.values(cart).reduce((a, b) => a + b.qty, 0), [cart]);
  const cdmMode = isCDMReservationOpen(); // Mode Coupe du Monde : site dédié uniquement
  const isOpen = cdmMode || orderWindow.isOpen; // En mode CDM, les commandes sont toujours ouvertes
  const nextOpeningLabel = useMemo(() => {
    if (isOpen) return null;
    return orderWindow.nextOpening.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  }, [orderWindow, isOpen]);

  // En mode CDM, on n'affiche que la box Coupe du Monde
  const visibleFormulas = cdmMode
    ? FORMULAS.filter((f) => f.id === "coupedumonde")
    : FORMULAS.filter((f) => !f.eventDate || isCoupeDuMondeActive());

  return (
    <div className="min-h-screen bg-[#FBF3E7] pb-28">
      <header className="px-6 pt-10 pb-8 text-center relative overflow-hidden">
        <div className="absolute -top-10 -left-10 w-40 h-40 opacity-20 rotate-12" aria-hidden>
          <Leaf className="w-full h-full text-[#5B6B4F]" strokeWidth={1} />
        </div>
        <button
          onClick={onOpenAdmin}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/70 flex items-center justify-center text-[#3E2F22]/50 active:scale-95"
          aria-label="Gérer le menu de la semaine"
        >
          <Settings className="w-4 h-4" />
        </button>
        <StampRing size={140}>
          <Heart className="w-5 h-5 text-[#E8A9A0] mb-1" fill="#E8A9A0" strokeWidth={0} />
          <h1 className="text-3xl text-[#3E2F22] leading-none" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600 }}>
            MGMR
          </h1>
          <p className="text-xl text-[#C97B63] -mt-1" style={{ fontFamily: "'Caveat', cursive" }}>
            Box Brunch
          </p>
        </StampRing>
        <p className="text-[11px] tracking-[0.15em] text-[#5B6B4F] uppercase mt-2">Bessens</p>
        <p className="mt-4 text-sm text-[#3E2F22]/70 max-w-xs mx-auto">
          Fait maison · produits frais · à emporter à l'heure qui vous convient.
        </p>
      </header>

      <main className="px-5">
        {!isOpen && (
          <div className="bg-[#C97B63]/10 rounded-xl px-4 py-3 text-sm text-[#C97B63] mb-5 text-center">
            <span className="font-semibold block mb-0.5">Commandes fermées pour le moment</span>
            Réouverture {nextOpeningLabel} à 12h00
          </div>
        )}

        <SectionEyebrow>{cdmMode ? "Soirée Coupe du Monde ⚽" : "Les box de la semaine"}</SectionEyebrow>
        {cdmMode && (
          <p className="text-center text-xs text-[#C97B63] mt-2 mb-1">
            Réservation ouverte jusqu'au dimanche 13 juillet à 21h
          </p>
        )}
        <div className="mt-5 flex flex-col gap-4">
          {visibleFormulas.map((formula) => {
            const qty = cart[formula.id]?.qty || 0;
            const items = weeklyContent[formula.id]?.length ? weeklyContent[formula.id] : formula.defaultItems;
            const isEvent = !!formula.eventDate;
            return (
              <div key={formula.id} className={`bg-white rounded-2xl p-4 shadow-sm border ${isEvent ? "border-[#C97B63]/30 ring-1 ring-[#C97B63]/20" : "border-[#3E2F22]/5"}`}>
                {isEvent && (
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <span className="text-xs font-semibold text-white bg-[#C97B63] rounded-full px-2.5 py-1">
                      {formula.badge}
                    </span>
                    <span className="text-xs text-[#C97B63]">Soirée spéciale · créneaux 18h30–20h00</span>
                  </div>
                )}
                <div className="flex gap-3 items-center">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                    style={{ background: "#FBF3E7" }}
                  >
                    {formula.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base text-[#3E2F22] font-semibold truncate" style={{ fontFamily: "'Fraunces', serif" }}>
                      {formula.name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-sm text-[#C97B63] font-semibold">{formula.price.toFixed(0)} €</span>
                      <span className="text-[10px] uppercase tracking-wide text-[#5B6B4F] bg-[#5B6B4F]/10 px-1.5 py-0.5 rounded-full truncate">
                        {formula.people}
                      </span>
                    </div>
                  </div>

                  {isOpen ? (
                    qty === 0 ? (
                      <button
                        onClick={() => onAdd(formula.id)}
                        className="shrink-0 w-9 h-9 rounded-full bg-[#C97B63] text-white flex items-center justify-center active:scale-95 transition"
                        aria-label={`Ajouter ${formula.name}`}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    ) : (
                      <div className="shrink-0 flex items-center gap-1.5 bg-[#FBF3E7] rounded-full px-1 py-1">
                        <button
                          onClick={() => onRemove(formula.id)}
                          className="w-7 h-7 rounded-full bg-white text-[#3E2F22] flex items-center justify-center active:scale-95"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-4 text-center text-sm font-semibold text-[#3E2F22]">{qty}</span>
                        <button
                          onClick={() => onAdd(formula.id)}
                          className="w-7 h-7 rounded-full bg-[#C97B63] text-white flex items-center justify-center active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )
                  ) : (
                    <div className="shrink-0 w-9 h-9 rounded-full bg-[#3E2F22]/5 flex items-center justify-center text-[#3E2F22]/30">
                      <Plus className="w-4 h-4" />
                    </div>
                  )}
                </div>

                <ul className="mt-3 pt-3 border-t border-dashed border-[#3E2F22]/10 flex flex-col gap-1">
                  {items.map((item, i) => (
                    <li key={i} className="text-xs text-[#3E2F22]/60 flex items-start gap-1.5">
                      <span className="text-[#C97B63] mt-0.5">·</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </main>

      {isOpen && totalCount > 0 && (
        <div className="fixed bottom-5 left-0 right-0 px-5">
          <button
            onClick={onGoCart}
            className="w-full max-w-md mx-auto flex items-center justify-between bg-[#3E2F22] text-[#FBF3E7] rounded-full pl-5 pr-2 py-2 shadow-lg active:scale-[0.98] transition"
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <ShoppingBag className="w-4 h-4" />
              Voir mon panier · {totalCount} box
            </span>
            <span className="bg-[#C97B63] rounded-full px-3 py-1.5 text-sm font-semibold">Continuer</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Écran Code PIN : protège l'accès à l'admin (menu de la semaine, commandes)
// ---------------------------------------------------------------------------
function PinScreen({ onBack, onSuccess }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const handleDigit = (d) => {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    setError(false);
    if (next.length === 4) {
      if (next === ADMIN_PIN) {
        setTimeout(() => onSuccess(), 150);
      } else {
        setError(true);
        setTimeout(() => setPin(""), 400);
      }
    }
  };

  const handleDelete = () => {
    setPin((p) => p.slice(0, -1));
    setError(false);
  };

  return (
    <div className="min-h-screen bg-[#FBF3E7] flex flex-col items-center px-6 pt-16 pb-10">
      <button
        onClick={onBack}
        className="self-start w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm mb-8"
        aria-label="Retour au menu"
      >
        <ArrowLeft className="w-4 h-4 text-[#3E2F22]" />
      </button>

      <div className="w-14 h-14 rounded-full bg-[#3E2F22]/5 flex items-center justify-center mb-4">
        <Lock className="w-6 h-6 text-[#C97B63]" />
      </div>
      <h2 className="text-lg text-[#3E2F22] text-center" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600 }}>
        Accès réservé
      </h2>
      <p className="text-sm text-[#3E2F22]/60 text-center mt-1 max-w-xs">
        Entrez le code à 4 chiffres pour gérer le menu et les commandes
      </p>

      <div className={`flex gap-3 mt-8 ${error ? "animate-pulse" : ""}`}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-12 h-12 rounded-xl border flex items-center justify-center text-lg font-semibold ${
              error ? "border-red-300 bg-red-50 text-red-500" : "border-[#3E2F22]/15 bg-white text-[#3E2F22]"
            }`}
          >
            {pin[i] ? "•" : ""}
          </div>
        ))}
      </div>
      {error && <p className="text-xs text-red-500 mt-2">Code incorrect</p>}

      <div className="grid grid-cols-3 gap-3 mt-10 w-full max-w-xs">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button
            key={d}
            onClick={() => handleDigit(d)}
            className="h-14 rounded-2xl bg-white text-lg font-semibold text-[#3E2F22] shadow-sm active:scale-95 transition"
          >
            {d}
          </button>
        ))}
        <div />
        <button
          onClick={() => handleDigit("0")}
          className="h-14 rounded-2xl bg-white text-lg font-semibold text-[#3E2F22] shadow-sm active:scale-95 transition"
        >
          0
        </button>
        <button
          onClick={handleDelete}
          className="h-14 rounded-2xl bg-white/60 text-sm font-medium text-[#3E2F22]/50 active:scale-95 transition"
        >
          Effacer
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Écran Admin : édition du contenu hebdomadaire (partagé)
// ---------------------------------------------------------------------------
function AdminScreen({ weeklyContent, onBack, onSave, onOpenOrders }) {
  const [draft, setDraft] = useState(() => {
    const initial = {};
    FORMULAS.forEach((f) => {
      const existing = weeklyContent[f.id];
      initial[f.id] = (existing && existing.length ? existing : f.defaultItems).join("\n");
    });
    return initial;
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleChange = (id, text) => {
    setDraft((prev) => ({ ...prev, [id]: text }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const newContent = {};
    Object.entries(draft).forEach(([id, text]) => {
      newContent[id] = text
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
    });
    await onSave(newContent);
    setSaving(false);
    setSaved(true);
  };

  return (
    <div className="min-h-screen bg-[#FBF3E7] pb-28">
      <header className="px-5 pt-6 pb-4 flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm"
          aria-label="Retour au menu"
        >
          <ArrowLeft className="w-4 h-4 text-[#3E2F22]" />
        </button>
        <div>
          <h2 className="text-lg text-[#3E2F22]" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600 }}>
            Menu de la semaine
          </h2>
          <p className="text-xs text-[#3E2F22]/50">Modifie le contenu, les prix restent fixes</p>
        </div>
      </header>

      <main className="px-5 flex flex-col gap-4">
        <button
          onClick={onOpenOrders}
          className="flex items-center justify-between bg-[#3E2F22] text-[#FBF3E7] rounded-2xl px-4 py-3.5 active:scale-[0.98] transition"
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <ListChecks className="w-4 h-4" />
            Commandes du jour & paiements
          </span>
          <span className="text-[#C97B63] text-sm">→</span>
        </button>

        <div className="bg-[#5B6B4F]/10 rounded-xl px-3 py-2.5 text-xs text-[#5B6B4F] flex items-start gap-2">
          <span>ⓘ</span>
          <span>Ces changements sont visibles par tous les clients qui ouvrent l'appli.</span>
        </div>

        {FORMULAS.map((formula) => (
          <div key={formula.id} className="bg-white rounded-2xl p-4 shadow-sm border border-[#3E2F22]/5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{formula.emoji}</span>
              <h3 className="text-sm text-[#3E2F22] font-semibold" style={{ fontFamily: "'Fraunces', serif" }}>
                {formula.name}
              </h3>
              <span className="text-xs text-[#C97B63] font-medium ml-auto">{formula.price.toFixed(0)} €</span>
            </div>
            <textarea
              value={draft[formula.id]}
              onChange={(e) => handleChange(formula.id, e.target.value)}
              rows={Math.max(4, draft[formula.id].split("\n").length)}
              placeholder="Un ingrédient par ligne…"
              className="w-full text-sm text-[#3E2F22] bg-[#FBF3E7] rounded-xl p-3 outline-none resize-none border border-transparent focus:border-[#C97B63]/40"
            />
            <p className="text-[11px] text-[#3E2F22]/40 mt-1.5">Un élément par ligne</p>
          </div>
        ))}
      </main>

      <div className="fixed bottom-5 left-0 right-0 px-5">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full max-w-md mx-auto flex items-center justify-center gap-2 bg-[#C97B63] text-white rounded-full py-3.5 shadow-lg active:scale-[0.98] transition disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <Check className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span className="text-sm font-semibold">
            {saving ? "Enregistrement…" : saved ? "Menu enregistré" : "Enregistrer le menu de la semaine"}
          </span>
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Écran Panier
// ---------------------------------------------------------------------------
function CartScreen({ cart, firstName, onFirstNameChange, phone, onPhoneChange, onBack, onAdd, onRemove, onNext }) {
  const items = Object.entries(cart).filter(([, v]) => v.qty > 0);
  const total = items.reduce((sum, [id, v]) => {
    const formula = FORMULAS.find((f) => f.id === id);
    return sum + formula.price * v.qty;
  }, 0);
  const phoneValid = phone.trim().replace(/\s/g, "").length >= 10;
  const nameValid = firstName.trim().length >= 2;
  const canContinue = phoneValid && nameValid;

  return (
    <div className="min-h-screen bg-[#FBF3E7] pb-32">
      <header className="px-5 pt-6 pb-4 flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm"
          aria-label="Retour au menu"
        >
          <ArrowLeft className="w-4 h-4 text-[#3E2F22]" />
        </button>
        <h2 className="text-lg text-[#3E2F22]" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600 }}>
          Votre panier
        </h2>
      </header>

      <main className="px-5 flex flex-col gap-4">
        {items.length === 0 && (
          <p className="text-sm text-[#3E2F22]/60 text-center mt-10">Votre panier est vide pour l'instant.</p>
        )}

        {items.map(([id, v]) => {
          const formula = FORMULAS.find((f) => f.id === id);
          return (
            <div key={id} className="bg-white rounded-2xl p-4 shadow-sm border border-[#3E2F22]/5 flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl shrink-0" style={{ background: "#FBF3E7" }}>
                {formula.emoji}
              </div>
              <div className="flex-1">
                <h3 className="text-sm text-[#3E2F22] font-semibold" style={{ fontFamily: "'Fraunces', serif" }}>
                  {formula.name}
                </h3>
                <p className="text-xs text-[#C97B63] font-medium">{(formula.price * v.qty).toFixed(2)} €</p>
              </div>
              <div className="flex items-center gap-2 bg-[#FBF3E7] rounded-full px-1.5 py-1">
                <button onClick={() => onRemove(id)} className="w-7 h-7 rounded-full bg-white text-[#3E2F22] flex items-center justify-center active:scale-95">
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-4 text-center text-sm font-semibold text-[#3E2F22]">{v.qty}</span>
                <button onClick={() => onAdd(id)} className="w-7 h-7 rounded-full bg-[#C97B63] text-white flex items-center justify-center active:scale-95">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        {items.length > 0 && (
          <>
            <div className="flex items-center justify-between px-1 mt-1">
              <span className="text-sm text-[#3E2F22]/70">Total</span>
              <span className="text-lg text-[#3E2F22] font-semibold" style={{ fontFamily: "'Fraunces', serif" }}>
                {total.toFixed(2)} €
              </span>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#3E2F22]/5">
              <label className="flex items-center gap-2 text-xs uppercase tracking-wide text-[#5B6B4F] mb-2">
                Votre prénom
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => onFirstNameChange(e.target.value)}
                placeholder="Camille"
                className="w-full text-sm text-[#3E2F22] bg-[#FBF3E7] rounded-xl px-3 py-2.5 outline-none border border-transparent focus:border-[#C97B63]/40"
              />
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#3E2F22]/5">
              <label className="flex items-center gap-2 text-xs uppercase tracking-wide text-[#5B6B4F] mb-2">
                <Phone className="w-3.5 h-3.5" />
                Votre numéro de téléphone
              </label>
              <input
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => onPhoneChange(e.target.value)}
                placeholder="06 12 34 56 78"
                className="w-full text-sm text-[#3E2F22] bg-[#FBF3E7] rounded-xl px-3 py-2.5 outline-none border border-transparent focus:border-[#C97B63]/40"
              />
              <p className="text-[11px] text-[#3E2F22]/45 mt-1.5">
                On vous envoie le lien de paiement par SMS ou WhatsApp.
              </p>
            </div>
          </>
        )}
      </main>

      {items.length > 0 && (
        <div className="fixed bottom-5 left-0 right-0 px-5">
          <button
            onClick={onNext}
            disabled={!canContinue}
            className="w-full max-w-md mx-auto flex items-center justify-center gap-2 bg-[#C97B63] text-white rounded-full py-3.5 shadow-lg active:scale-[0.98] transition disabled:opacity-40 disabled:active:scale-100"
          >
            <Clock className="w-4 h-4" />
            <span className="text-sm font-semibold">Choisir l'heure de retrait</span>
          </button>
          {!canContinue && (
            <p className="text-center text-xs text-[#3E2F22]/50 mt-2">
              Entrez votre prénom et votre numéro pour continuer
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Écran Créneau
// ---------------------------------------------------------------------------
function SlotScreen({ onBack, selectedSlot, onSelectSlot, onConfirm, sundayLabel, boxAlreadyBooked, boxInCart, loadingCapacity, isEventOrder }) {
  const remaining = WEEKLY_BOX_LIMIT - boxAlreadyBooked;
  const wouldExceed = boxInCart > remaining;
  const isFull = remaining <= 0;

  const coupeDuMondeFormula = FORMULAS.find((f) => f.id === "coupedumonde");
  const activeSlots = isEventOrder ? coupeDuMondeFormula.eventSlots : TIME_SLOTS;
  const retaitLabel = isEventOrder
    ? "Mardi 14 juillet · Soirée Coupe du Monde"
    : `Retrait sur place, ${sundayLabel ? sundayLabel.toLowerCase() : "dimanche"}.`;
  const creneauxLabel = isEventOrder
    ? "Créneaux de 30 minutes · 18h30 – 20h00"
    : "Créneaux de 20 minutes · 9h30 – 11h00";

  return (
    <div className="min-h-screen bg-[#FBF3E7] pb-28">
      <header className="px-5 pt-6 pb-4 flex items-center gap-3">
        <button onClick={onBack} className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm" aria-label="Retour au panier">
          <ArrowLeft className="w-4 h-4 text-[#3E2F22]" />
        </button>
        <h2 className="text-lg text-[#3E2F22]" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600 }}>
          Heure de retrait
        </h2>
      </header>

      <main className="px-5">
        <p className="text-sm text-[#3E2F22]/60 mb-1">{retaitLabel}</p>
        <p className="text-xs text-[#5B6B4F] mb-1">{creneauxLabel}</p>

        {!isEventOrder && (
          loadingCapacity ? (
            <p className="text-xs text-[#3E2F22]/40 mb-5">Vérification des places disponibles…</p>
          ) : isFull ? (
            <div className="bg-[#C97B63]/10 rounded-xl px-3 py-2.5 text-xs text-[#C97B63] mb-5">
              Complet pour ce dimanche — toutes les box ont déjà été réservées. Revenez la semaine prochaine !
            </div>
          ) : (
            <p className="text-xs text-[#5B6B4F] mb-5">
              {remaining} box restantes sur {WEEKLY_BOX_LIMIT} pour ce dimanche
            </p>
          )
        )}

        {!isFull && wouldExceed && (
          <div className="bg-[#C97B63]/10 rounded-xl px-3 py-2.5 text-xs text-[#C97B63] mb-5">
            Il ne reste que {remaining} box disponible{remaining > 1 ? "s" : ""} pour ce dimanche — réduisez les quantités dans votre panier.
          </div>
        )}

        <div className="grid grid-cols-3 gap-2.5">
          {activeSlots.map((slot) => {
            const isSelected = selectedSlot === slot;
            const disabled = !isEventOrder && (isFull || wouldExceed || loadingCapacity);
            return (
              <button
                key={slot}
                disabled={disabled}
                onClick={() => onSelectSlot(slot)}
                className={`relative rounded-xl py-3 text-sm font-medium border transition ${
                  disabled
                    ? "bg-[#3E2F22]/5 text-[#3E2F22]/30 border-transparent cursor-not-allowed"
                    : isSelected
                    ? "bg-[#5B6B4F] text-white border-[#5B6B4F] shadow-md"
                    : "bg-white text-[#3E2F22] border-[#3E2F22]/10 active:scale-95"
                }`}
              >
                {slot}
              </button>
            );
          })}
        </div>
      </main>

      <div className="fixed bottom-5 left-0 right-0 px-5">
        <button
          onClick={onConfirm}
          disabled={!selectedSlot || (!isEventOrder && (isFull || wouldExceed))}
          className="w-full max-w-md mx-auto flex items-center justify-center gap-2 bg-[#C97B63] text-white rounded-full py-3.5 shadow-lg active:scale-[0.98] transition disabled:opacity-40 disabled:active:scale-100"
        >
          <Check className="w-4 h-4" />
          <span className="text-sm font-semibold">{selectedSlot ? `Confirmer pour ${selectedSlot}` : "Choisissez un créneau"}</span>
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Écran Confirmation
// ---------------------------------------------------------------------------
function ConfirmScreen({ order, onNewOrder }) {
  const items = Object.entries(order.cart).filter(([, v]) => v.qty > 0);
  const total = items.reduce((sum, [id, v]) => {
    const formula = FORMULAS.find((f) => f.id === id);
    return sum + formula.price * v.qty;
  }, 0);

  return (
    <div className="min-h-screen bg-[#FBF3E7] flex flex-col items-center px-5 pt-12 pb-10">
      <StampRing size={110}>
        <Check className="w-7 h-7 text-[#5B6B4F]" strokeWidth={2.5} />
      </StampRing>

      <h2 className="text-2xl text-[#3E2F22] mt-4 text-center" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600 }}>
        Commande confirmée
      </h2>
      <p className="text-lg text-[#C97B63] -mt-0.5" style={{ fontFamily: "'Caveat', cursive" }}>
        À très vite !
      </p>

      <div className="flex items-center gap-1.5 mt-3 bg-[#E8A9A0]/20 text-[#C97B63] text-xs font-medium rounded-full px-3 py-1.5">
        <Clock className="w-3.5 h-3.5" />
        Lien de paiement envoyé par SMS sous peu
      </div>

      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-[#3E2F22]/5 mt-6 p-5">
        <div className="flex items-center justify-between pb-3 border-b border-dashed border-[#3E2F22]/15">
          <span className="text-xs uppercase tracking-wide text-[#5B6B4F]">Retrait à emporter</span>
          <span className="text-base font-semibold text-[#3E2F22] text-right" style={{ fontFamily: "'Fraunces', serif" }}>
            {order.sundayLabel ? `${order.sundayLabel} · ` : ""}{order.slot}
          </span>
        </div>

        <div className="flex items-center justify-between py-2.5 border-b border-dashed border-[#3E2F22]/15">
          <span className="text-xs text-[#3E2F22]/50 flex items-center gap-1.5">
            <Phone className="w-3 h-3" />
            Contact
          </span>
          <span className="text-sm text-[#3E2F22]">
            {order.firstName ? `${order.firstName} · ` : ""}{order.phone}
          </span>
        </div>

        <div className="flex flex-col gap-2.5 py-3">
          {items.map(([id, v]) => {
            const formula = FORMULAS.find((f) => f.id === id);
            return (
              <div key={id} className="flex items-start justify-between gap-2">
                <span className="text-sm text-[#3E2F22] font-medium">
                  {v.qty}× {formula.name}
                </span>
                <span className="text-sm text-[#3E2F22]/70 shrink-0">{(formula.price * v.qty).toFixed(2)} €</span>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-dashed border-[#3E2F22]/15">
          <span className="text-sm font-semibold text-[#3E2F22]">Total</span>
          <span className="text-lg font-semibold text-[#C97B63]" style={{ fontFamily: "'Fraunces', serif" }}>
            {total.toFixed(2)} €
          </span>
        </div>
      </div>

      <p className="text-xs text-[#3E2F22]/40 mt-5 text-center max-w-xs">
        Numéro de commande : {order.id}
        <br />
        Présentez-vous à l'heure indiquée, votre box vous attendra.
      </p>

      <button onClick={onNewOrder} className="mt-8 text-sm text-[#5B6B4F] underline underline-offset-2">
        Passer une nouvelle commande
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Écran Admin : Commandes du jour — pour générer et suivre les paiements
// ---------------------------------------------------------------------------
function OrdersScreen({ orders, onBack, onTogglePaid, onDelete, loading }) {
  const [copiedId, setCopiedId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const sorted = [...orders].sort((a, b) => (a.slot || "").localeCompare(b.slot || ""));
  const totalDue = orders.filter((o) => !o.paid).reduce((sum, o) => sum + o.total, 0);

  const handleCopy = (order) => {
    const text = `MGMR Box Brunch — Commande ${order.id}\n${order.firstName ? `Client : ${order.firstName}\n` : ""}${order.lines.join("\n")}\nTotal : ${order.total.toFixed(2)} €\nRetrait : ${order.slot}\nTél : ${order.phone}`;
    navigator.clipboard?.writeText(text);
    setCopiedId(order.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleDeleteClick = (orderId) => {
    if (confirmDeleteId === orderId) {
      onDelete(orderId);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(orderId);
      setTimeout(() => setConfirmDeleteId((id) => (id === orderId ? null : id)), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF3E7] pb-12">
      <header className="px-5 pt-6 pb-4 flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm"
          aria-label="Retour au menu"
        >
          <ArrowLeft className="w-4 h-4 text-[#3E2F22]" />
        </button>
        <div>
          <h2 className="text-lg text-[#3E2F22]" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600 }}>
            Commandes du jour
          </h2>
          <p className="text-xs text-[#3E2F22]/50">Copiez les infos pour créer le lien Stripe / SumUp</p>
        </div>
      </header>

      <main className="px-5 flex flex-col gap-3">
        {loading && (
          <div className="flex justify-center py-10">
            <Loader2 className="w-5 h-5 text-[#C97B63] animate-spin" />
          </div>
        )}

        {!loading && orders.length === 0 && (
          <p className="text-sm text-[#3E2F22]/60 text-center mt-10">Aucune commande pour l'instant.</p>
        )}

        {!loading && orders.length > 0 && (
          <div className="bg-[#5B6B4F]/10 rounded-xl px-3 py-2.5 text-xs text-[#5B6B4F] flex items-center justify-between mb-1">
            <span>En attente de paiement</span>
            <span className="font-semibold">{totalDue.toFixed(2)} €</span>
          </div>
        )}

        {sorted.map((order) => (
          <div key={order.id} className="bg-white rounded-2xl p-4 shadow-sm border border-[#3E2F22]/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[#3E2F22]" style={{ fontFamily: "'Fraunces', serif" }}>
                  {order.slot || "—"}
                </span>
                <span className="text-[10px] text-[#3E2F22]/40">#{order.id}</span>
              </div>
              <span
                className={`text-[10px] uppercase tracking-wide px-2 py-1 rounded-full font-medium ${
                  order.paid ? "bg-[#5B6B4F]/15 text-[#5B6B4F]" : "bg-[#C97B63]/15 text-[#C97B63]"
                }`}
              >
                {order.paid ? "Payée" : "En attente"}
              </span>
            </div>

            <ul className="mt-2 flex flex-col gap-0.5">
              {order.lines.map((line, i) => (
                <li key={i} className="text-xs text-[#3E2F22]/70">{line}</li>
              ))}
            </ul>

            <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-dashed border-[#3E2F22]/10">
              <span className="text-xs text-[#3E2F22]/60 flex items-center gap-1.5">
                <Phone className="w-3 h-3" />
                {order.firstName ? `${order.firstName} · ` : ""}{order.phone}
              </span>
              <span className="text-sm font-semibold text-[#3E2F22]">{order.total.toFixed(2)} €</span>
            </div>

            <div className="flex gap-2 mt-3">
              <button
                onClick={() => handleCopy(order)}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-[#3E2F22] bg-[#FBF3E7] rounded-full py-2 active:scale-95 transition"
              >
                {copiedId === order.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedId === order.id ? "Copié" : "Copier le récap"}
              </button>
              <button
                onClick={() => onTogglePaid(order.id, !order.paid)}
                className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium rounded-full py-2 active:scale-95 transition ${
                  order.paid ? "bg-[#3E2F22]/5 text-[#3E2F22]/50" : "bg-[#5B6B4F] text-white"
                }`}
              >
                <CircleDollarSign className="w-3.5 h-3.5" />
                {order.paid ? "Marquer non payée" : "Marquer payée"}
              </button>
            </div>

            <button
              onClick={() => handleDeleteClick(order.id)}
              className={`w-full flex items-center justify-center gap-1.5 text-xs font-medium rounded-full py-2 mt-2 active:scale-95 transition ${
                confirmDeleteId === order.id
                  ? "bg-red-500 text-white"
                  : "bg-transparent text-red-400/70"
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              {confirmDeleteId === order.id ? "Confirmer la suppression" : "Supprimer cette commande"}
            </button>
          </div>
        ))}
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// App racine
// ---------------------------------------------------------------------------
export default function App() {
  const [step, setStep] = useState("loading"); // loading | menu | pin | admin | orders | cart | slot | confirm
  const [cart, setCart] = useState({});
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [lastOrder, setLastOrder] = useState(null);
  const [weeklyContent, setWeeklyContent] = useState({});
  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [boxAlreadyBooked, setBoxAlreadyBooked] = useState(0);
  const [loadingCapacity, setLoadingCapacity] = useState(false);

  const nextSunday = useMemo(() => getNextSunday(), []);
  const sundayLabel = useMemo(() => formatSundayLabel(nextSunday.date), [nextSunday]);
  const boxInCart = useMemo(() => Object.values(cart).reduce((sum, v) => sum + v.qty, 0), [cart]);
  const orderWindow = useMemo(() => getOrderWindowStatus(), []);
  const cdmMode = useMemo(() => isCDMReservationOpen(), []);
  // En mode CDM ou si le panier contient la box Coupe du Monde → créneaux spéciaux
  const isEventOrder = useMemo(() => cdmMode || !!cart.coupedumonde?.qty, [cdmMode, cart]);

  useEffect(() => {
    (async () => {
      try {
        const result = await window.storage.get(STORAGE_KEY, true);
        if (result?.value) {
          setWeeklyContent(JSON.parse(result.value));
        }
      } catch (e) {
        // Pas encore de menu enregistré, on garde les contenus par défaut
      }
      setStep("menu");
    })();
  }, []);

  const handleAdd = (id) => {
    setCart((prev) => ({ ...prev, [id]: { qty: (prev[id]?.qty || 0) + 1 } }));
  };

  const handleRemove = (id) => {
    setCart((prev) => {
      const current = prev[id]?.qty || 0;
      if (current <= 1) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: { qty: current - 1 } };
    });
  };

  const handleSaveWeeklyContent = async (newContent) => {
    setWeeklyContent(newContent);
    try {
      await window.storage.set(STORAGE_KEY, JSON.stringify(newContent), true);
    } catch (e) {
      console.error("Impossible d'enregistrer le menu de la semaine", e);
    }
  };

  const handleConfirmOrder = async () => {
    // Sécurité : revérifie que la fenêtre de commande est toujours ouverte.
    // En mode CDM, la fenêtre de réservation spéciale prend le dessus.
    if (!isCDMReservationOpen() && !getOrderWindowStatus().isOpen) {
      setStep("menu");
      return;
    }

    const items = Object.entries(cart).filter(([, v]) => v.qty > 0);
    const total = items.reduce((sum, [id, v]) => {
      const formula = FORMULAS.find((f) => f.id === id);
      return sum + formula.price * v.qty;
    }, 0);
    const lines = items.map(([id, v]) => {
      const formula = FORMULAS.find((f) => f.id === id);
      return `${v.qty}× ${formula.name}`;
    });

    const order = {
      id: Math.random().toString(36).slice(2, 8).toUpperCase(),
      cart,
      lines,
      total,
      slot: selectedSlot,
      sundayIso: nextSunday.iso,
      sundayLabel,
      firstName: firstName.trim(),
      phone: phone.trim(),
      paid: false,
      createdAt: new Date().toISOString(),
    };
    try {
      // Commande visible par l'admin (partagée) pour suivre le paiement
      await window.storage.set(`order:${order.id}`, JSON.stringify(order), true);
    } catch (e) {
      console.error("Impossible d'enregistrer la commande", e);
    }

    // Notification push (ntfy.sh) pour avertir immédiatement de la commande
    try {
      await fetch(`https://ntfy.sh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: NTFY_TOPIC,
          title: `Nouvelle commande - ${order.total.toFixed(2)} EUR`,
          message: `${order.firstName || "Client"} - ${order.phone}\n${order.lines.join(", ")}\nRetrait : ${order.slot}`,
          priority: 5,
          tags: ["shopping_cart"],
        }),
      });
    } catch (e) {
      console.error("Notification push non envoyée", e);
    }

    setLastOrder(order);
    setStep("confirm");
  };

  const handleNewOrder = () => {
    setCart({});
    setSelectedSlot(null);
    setPhone("");
    setFirstName("");
    setLastOrder(null);
    setStep("menu");
  };

  const loadOrders = async () => {
    setOrdersLoading(true);
    try {
      const list = await window.storage.list("order:", true);
      const keys = list?.keys || [];
      const fetched = await Promise.all(
        keys.map(async (k) => {
          try {
            const r = await window.storage.get(k, true);
            return r?.value ? JSON.parse(r.value) : null;
          } catch {
            return null;
          }
        })
      );
      setOrders(fetched.filter(Boolean));
    } catch (e) {
      console.error("Impossible de charger les commandes", e);
      setOrders([]);
    }
    setOrdersLoading(false);
  };

  const handleOpenOrders = () => {
    setStep("orders");
    loadOrders();
  };

  const loadSundayCapacity = async () => {
    setLoadingCapacity(true);
    try {
      const list = await window.storage.list("order:", true);
      const keys = list?.keys || [];
      const fetched = await Promise.all(
        keys.map(async (k) => {
          try {
            const r = await window.storage.get(k, true);
            return r?.value ? JSON.parse(r.value) : null;
          } catch {
            return null;
          }
        })
      );
      const total = fetched
        .filter(Boolean)
        .filter((o) => o.sundayIso === nextSunday.iso)
        .reduce((sum, o) => sum + Object.values(o.cart || {}).reduce((s, v) => s + v.qty, 0), 0);
      setBoxAlreadyBooked(total);
    } catch (e) {
      console.error("Impossible de calculer les places disponibles", e);
      setBoxAlreadyBooked(0);
    }
    setLoadingCapacity(false);
  };

  const handleTogglePaid = async (orderId, paid) => {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, paid } : o)));
    const target = orders.find((o) => o.id === orderId);
    if (!target) return;
    const updated = { ...target, paid };
    try {
      await window.storage.set(`order:${orderId}`, JSON.stringify(updated), true);
    } catch (e) {
      console.error("Impossible de mettre à jour la commande", e);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    try {
      await window.storage.delete(`order:${orderId}`, true);
    } catch (e) {
      console.error("Impossible de supprimer la commande", e);
    }
  };

  if (step === "loading") {
    return (
      <div className="min-h-screen bg-[#FBF3E7] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[#C97B63] animate-spin" />
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }} className="w-full overflow-x-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@500;600;700&family=Caveat:wght@600;700&family=Inter:wght@400;500;600&display=swap');
      `}</style>

      {step === "menu" && (
        <MenuScreen
          cart={cart}
          weeklyContent={weeklyContent}
          onAdd={handleAdd}
          onRemove={handleRemove}
          onGoCart={() => setStep("cart")}
          onOpenAdmin={() => setStep("pin")}
          orderWindow={orderWindow}
        />
      )}

      {step === "pin" && (
        <PinScreen onBack={() => setStep("menu")} onSuccess={() => setStep("admin")} />
      )}

      {step === "admin" && (
        <AdminScreen
          weeklyContent={weeklyContent}
          onBack={() => setStep("menu")}
          onSave={handleSaveWeeklyContent}
          onOpenOrders={handleOpenOrders}
        />
      )}

      {step === "orders" && (
        <OrdersScreen
          orders={orders}
          loading={ordersLoading}
          onBack={() => setStep("admin")}
          onTogglePaid={handleTogglePaid}
          onDelete={handleDeleteOrder}
        />
      )}

      {step === "cart" && (
        <CartScreen
          cart={cart}
          firstName={firstName}
          onFirstNameChange={setFirstName}
          phone={phone}
          onPhoneChange={setPhone}
          onBack={() => setStep("menu")}
          onAdd={handleAdd}
          onRemove={handleRemove}
          onNext={() => {
            setStep("slot");
            loadSundayCapacity();
          }}
        />
      )}

      {step === "slot" && (
        <SlotScreen
          onBack={() => setStep("cart")}
          selectedSlot={selectedSlot}
          onSelectSlot={setSelectedSlot}
          onConfirm={handleConfirmOrder}
          sundayLabel={sundayLabel}
          boxAlreadyBooked={boxAlreadyBooked}
          boxInCart={boxInCart}
          loadingCapacity={loadingCapacity}
          isEventOrder={isEventOrder}
        />
      )}

      {step === "confirm" && lastOrder && <ConfirmScreen order={lastOrder} onNewOrder={handleNewOrder} />}
    </div>
  );
}
