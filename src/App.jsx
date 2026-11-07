```jsx
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
  Truck,
  MapPin,
} from "lucide-react";

// Code PIN pour protéger l'accès à l'écran admin (menu de la semaine,
// commandes du jour). Seule la personne qui connaît ce code peut y entrer.
const ADMIN_PIN = "1208";

// Canal de notification push (app ntfy.sh) — une notification est envoyée
// à ce canal à chaque nouvelle commande confirmée.
const NTFY_TOPIC = "mgmr-brunch82-cmd9k2";

// ---------------------------------------------------------------------------
// Les 6 formules : structure et prix FIXES (ne changent pas).
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
    price: 30,
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
    id: "bigbrunch",
    name: "BigBox Brunch",
    price: 43,
    people: "4 personnes",
    emoji: "🥞",
    defaultItems: [
      "Bagels garnis",
      "Sandwichs",
      "Mini pancakes",
      "Cakes maison",
      "Desserts gourmands",
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
    price: 43,
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
];

// Options ajoutables à la commande (en plus des box)
const OPTIONS = [
  { id: "wrap", name: "Wrap poulet bacon", price: 1.5 },
  { id: "burger", name: "Burger", price: 2 },
  { id: "jus", name: "Jus d'orange sans pulpe 150 ml", price: 2 },
  { id: "cookie", name: "Cookie", price: 1 },
  { id: "pancake", name: "Pancake", price: 0.5 },
  { id: "dessert", name: "Dessert MGMR", price: 2 },
  { id: "pain", name: "P'tit pain", price: 0.5 },
  { id: "charcuterie", name: "Portion charcuterie", price: 2.5 },
  { id: "fromage", name: "Portion fromage", price: 2.5 },
];

function optionsTotal(extras) {
  return OPTIONS.reduce((sum, o) => sum + o.price * (extras[o.id] || 0), 0);
}

// ---------------------------------------------------------------------------
// Batch cooking : réservable le lundi, retrait ou livraison entre 17h et 18h30
// ---------------------------------------------------------------------------
const BATCH_SLOTS = ["17h00", "17h15", "17h30", "17h45", "18h00", "18h15", "18h30"];
const BATCH_WINDOW_LABEL = "17h00–18h30";

const BATCH_GROUPS = [
  {
    title: "Formule midi",
    note: "5 gamelles individuelles / semaine",
    options: [{ id: "midi", label: "5 gamelles individuelles", price: 59 }],
  },
  {
    title: "Formule soir",
    note: "5 repas par semaine",
    options: [
      { id: "soir-solo", label: "Solo (1 personne)", price: 69 },
      { id: "soir-duo", label: "Duo (2 personnes)", price: 109 },
      { id: "soir-trio", label: "Trio (3 personnes)", price: 139 },
      { id: "soir-famille", label: "Famille (4 personnes)", price: 169 },
      { id: "soir-grande", label: "Grande famille (5 personnes)", price: 209 },
    ],
  },
  {
    title: "Formule complète",
    note: "midi + soir",
    options: [
      { id: "full-solo", label: "Solo (1 personne)", price: 125 },
      { id: "full-duo", label: "Duo (2 personnes)", price: 165 },
      { id: "full-trio", label: "Trio (3 personnes)", price: 195 },
      { id: "full-famille", label: "Famille (4 personnes)", price: 225 },
      { id: "full-grande", label: "Grande famille (5 personnes)", price: 265 },
    ],
  },
];

const BATCH_DISHES = [
  "Burger MGMR",
  "Wrap poulet",
  "Poulet coco-curry",
  "Lasagnes bolognaise",
  "Poulet rôti aux herbes",
  "Pâtes au saumon",
  "Boulettes de bœuf",
  "Quiche lorraine",
  "Blanquette de poulet",
  "Hachis parmentier",
  "Salade poulet",
  "Gratin de pâtes jambon-fromage",
  "Saucisse lentilles",
  "Croque-monsieur",
  "Croque-monsieur aux brocolis",
  "Quiche aux poireaux",
  "Poké bowl saumon",
  "Poké bowl crevettes",
  "Butternut farci",
];

const STORAGE_KEY = "weekly-menu-content";
const BLOCKED_DATES_KEY = "blocked-dates"; // anciennement blocked-sundays
const SCHEDULE_KEY = "week-schedule"; // { lundi: { active, slots }, mardi: ... }
const OPEN_DATES_KEY = "open-dates"; // { "2026-11-07": "18h30, 18h45", ... } week-ends ouverts

const WEEKLY_BOX_LIMIT = 8;

// Zone de livraison : 25 km (à vol d'oiseau) autour de Bessens (82170)
const DELIVERY_CENTER = { lat: 43.8806, lng: 1.2531 };
const DELIVERY_MAX_KM = 25;
// Tarifs : gratuit à Bessens, 2 € si moins de 15 km, 4 € de 15 à 25 km
const DELIVERY_FEE_NEAR = 2;
const DELIVERY_FEE_FAR = 4;
const DELIVERY_NEAR_KM = 15;

const normalizeText = (t) => (t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

function deliveryFeeFor(km, city) {
  if (normalizeText(city) === "bessens") return 0;
  return km < DELIVERY_NEAR_KM ? DELIVERY_FEE_NEAR : DELIVERY_FEE_FAR;
}

function isAddressValid(f) {
  return f.street.trim().length >= 3 && /^\d{5}$/.test(f.postcode.trim()) && f.city.trim().length >= 2;
}

// Vérifie l'adresse (distance + frais) pendant la saisie
function useDeliveryCheck(deliveryMode, addressForm) {
  const [info, setInfo] = useState(null);
  useEffect(() => {
    if (!deliveryMode || !isAddressValid(addressForm)) {
      setInfo(null);
      return;
    }
    let cancelled = false;
    setInfo({ status: "checking" });
    const t = setTimeout(async () => {
      const res = await checkDeliveryAddress(addressForm);
      if (!cancelled) setInfo(res);
    }, 700);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [deliveryMode, addressForm]);
  return info;
}

function haversineKm(a, b) {
  const R = 6371;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Géocode l'adresse (API officielle adresse.data.gouv.fr) et calcule la distance
async function checkDeliveryAddress({ street, postcode, city }) {
  try {
    const q = `${street} ${postcode} ${city}`.trim();
    const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=1`);
    if (!res.ok) throw new Error("http " + res.status);
    const data = await res.json();
    const f = data?.features?.[0];
    if (!f || (f.properties?.score ?? 0) < 0.5) {
      return { status: "notfound", message: "Adresse introuvable. Vérifiez la rue, le code postal et la ville." };
    }
    const [lng, lat] = f.geometry.coordinates;
    const km = haversineKm(DELIVERY_CENTER, { lat, lng });
    if (km > DELIVERY_MAX_KM) {
      return {
        status: "toofar",
        km,
        message: `Désolé, nous livrons uniquement dans un rayon de ${DELIVERY_MAX_KM} km autour de Bessens (votre adresse est à environ ${Math.round(km)} km). Vous pouvez choisir le retrait sur place.`,
      };
    }
    return {
      status: "ok",
      km: Math.round(km * 10) / 10,
      fee: deliveryFeeFor(km, f.properties?.city),
    };
  } catch (e) {
    return { status: "error", message: "Impossible de vérifier l'adresse pour le moment. Réessayez dans un instant." };
  }
}

// Jours de la semaine (ordre JS : 0=dim, 1=lun, ..., 6=sam)
const WEEK_DAYS = [
  { key: "lundi",    jsDay: 1, label: "Lundi",    emoji: "📦" },
  { key: "mardi",   jsDay: 2, label: "Mardi",    emoji: "📦" },
  { key: "mercredi",jsDay: 3, label: "Mercredi", emoji: "📦" },
  { key: "jeudi",   jsDay: 4, label: "Jeudi",    emoji: "📦" },
  { key: "vendredi",jsDay: 5, label: "Vendredi", emoji: "📦" },
  { key: "samedi",  jsDay: 6, label: "Samedi",   emoji: "🧀" },
  { key: "dimanche",jsDay: 0, label: "Dimanche", emoji: "🥐" },
];

// Schedule par défaut. Les week-ends (samedi / dimanche) sont maintenant gérés
// date par date dans "Week-ends ouverts" ; les créneaux ci-dessous servent de
// créneaux proposés par défaut quand on ouvre un week-end.
const DEFAULT_SCHEDULE = {
  lundi:    { active: false, slots: "10h00, 10h30, 11h00" },
  mardi:    { active: false, slots: "10h00, 10h30, 11h00" },
  mercredi: { active: false, slots: "10h00, 10h30, 11h00" },
  jeudi:    { active: false, slots: "10h00, 10h30, 11h00" },
  vendredi: { active: false, slots: "10h00, 10h30, 11h00" },
  samedi:   { active: false, slots: "18h30, 18h45, 19h00, 19h15, 19h30" },
  dimanche: { active: false, slots: "10h00, 10h15, 10h30, 10h45, 11h00" },
};

// Parse une chaîne de créneaux "10h00, 10h30" en tableau ["10h00", "10h30"]
function parseSlots(slotsStr) {
  return (slotsStr || "").split(",").map((s) => s.trim()).filter(Boolean);
}

function toIso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Calcule la date (locale) d'un jour donné de la semaine en cours ou suivante.
// jsDay : 0=dim, 1=lun, ..., 6=sam
// Retourne toujours une date dans le futur (au moins aujourd'hui ou après).
function getNextDateForDay(jsDay, blockedDates = []) {
  const today = new Date();
  const todayDay = today.getDay();
  let diff = jsDay - todayDay;
  if (diff < 0) diff += 7;
  if (diff === 0) diff = 7; // On ne propose jamais le jour même
  for (let attempt = 0; attempt < 8; attempt++) {
    const d = new Date(today);
    d.setDate(today.getDate() + diff + attempt * 7);
    d.setHours(12, 0, 0, 0);
    const iso = toIso(d);
    if (!blockedDates.includes(iso)) return { iso, date: d };
  }
  const fallback = new Date(today);
  fallback.setDate(today.getDate() + diff);
  fallback.setHours(12, 0, 0, 0);
  return { iso: fallback.toISOString().slice(0, 10), date: fallback };
}

function formatDayLabel(date) {
  const formatted = date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

// Liste les samedis et dimanches (à venir) d'un mois.
// monthOffset : 0 = mois en cours, 1 = mois suivant
function getWeekendDates(monthOffset = 0) {
  const now = new Date();
  const todayIso = toIso(now);
  const year = now.getFullYear();
  const month = now.getMonth() + monthOffset;
  const first = new Date(year, month, 1, 12, 0, 0, 0);
  const result = [];
  const d = new Date(first);
  while (d.getMonth() === first.getMonth()) {
    const jsDay = d.getDay();
    if (jsDay === 6 || jsDay === 0) {
      const iso = toIso(d);
      if (iso > todayIso) {
        const base = WEEK_DAYS.find((w) => w.jsDay === jsDay);
        result.push({ iso, date: new Date(d), jsDay, label: base.label, emoji: base.emoji });
      }
    }
    d.setDate(d.getDate() + 1);
  }
  return { monthDate: first, dates: result };
}

// Calcule les prochains jours disponibles :
//  - jours de semaine (lundi → vendredi) actifs dans le planning
//  - week-ends ouverts date par date par l'admin
function getScheduleWithDates(schedule, blockedDates = [], openDates = {}) {
  const todayIso = toIso(new Date());

  const weekdayEntries = WEEK_DAYS
    .filter((d) => d.jsDay !== 0 && d.jsDay !== 6 && schedule[d.key]?.active)
    .map((d) => ({
      ...d,
      slots: parseSlots(schedule[d.key].slots || ""),
      nextDate: getNextDateForDay(d.jsDay, blockedDates),
    }));

  const weekendEntries = Object.entries(openDates || {})
    .filter(([iso]) => iso > todayIso)
    .map(([iso, slotsStr]) => {
      const date = new Date(iso + "T12:00:00");
      const base = WEEK_DAYS.find((w) => w.jsDay === date.getDay());
      return {
        key: iso,
        jsDay: date.getDay(),
        label: base.label,
        emoji: base.emoji,
        slots: parseSlots(slotsStr),
        nextDate: { iso, date },
      };
    })
    .filter((e) => e.slots.length > 0);

  return [...weekdayEntries, ...weekendEntries].sort((a, b) => a.nextDate.date - b.nextDate.date);
}

// Statut d'ouverture : ouvert dès qu'au moins un jour est disponible
function getOrderWindowStatus(schedule = DEFAULT_SCHEDULE, openDates = {}) {
  const isOpen = getScheduleWithDates(schedule, [], openDates).length > 0;
  return { isOpen };
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
// Écran Choix du jour : jours de retrait ouverts par l'admin
// ---------------------------------------------------------------------------
function DayPickerScreen({ onSelectDay, schedule, blockedDates, openDates, onOpenAdmin, batchDate }) {
  const activeDays = useMemo(
    () => getScheduleWithDates(schedule, blockedDates, openDates),
    [schedule, blockedDates, openDates]
  );

  return (
    <div className="min-h-screen bg-[#FBF3E7] pb-28">
      <header className="px-6 pt-10 pb-8 text-center relative overflow-hidden">
        <div className="absolute -top-10 -left-10 w-40 h-40 opacity-20 rotate-12" aria-hidden>
          <Leaf className="w-full h-full text-[#5B6B4F]" strokeWidth={1} />
        </div>
        <button
          onClick={onOpenAdmin}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/70 flex items-center justify-center text-[#3E2F22]/50 active:scale-95"
        >
          <Settings className="w-4 h-4" />
        </button>
        <StampRing size={140}>
          <Heart className="w-5 h-5 text-[#E8A9A0] mb-1" fill="#E8A9A0" strokeWidth={0} />
          <h1 className="text-3xl text-[#3E2F22] leading-none" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600 }}>
            MGMR
          </h1>
          <p className="text-xl text-[#C97B63] -mt-1" style={{ fontFamily: "'Caveat', cursive" }}>
            Brunch & Événement
          </p>
        </StampRing>
        <p className="text-[11px] tracking-[0.15em] text-[#5B6B4F] uppercase mt-2">Bessens</p>
        <p className="mt-3 text-sm text-[#3E2F22]/70 max-w-xs mx-auto">
          Choisissez votre jour de retrait
        </p>
      </header>

      <main className="px-5 flex flex-col gap-4">
        {activeDays.length === 0 && (
          <div className="bg-[#C97B63]/10 rounded-xl px-4 py-4 text-sm text-[#C97B63] text-center">
            <span className="font-semibold block mb-1">Aucun jour disponible pour le moment</span>
            Revenez bientôt !
          </div>
        )}

        {activeDays.map((day) => (
          <button
            key={day.key}
            onClick={() => onSelectDay(day.key)}
            className="bg-white rounded-2xl p-5 shadow-sm border border-[#3E2F22]/5 text-left active:scale-[0.98] transition"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-[#FBF3E7] flex items-center justify-center text-3xl shrink-0">
                {day.emoji}
              </div>
              <div className="flex-1">
                <p className="text-base font-semibold text-[#3E2F22]" style={{ fontFamily: "'Fraunces', serif" }}>
                  {day.label}
                </p>
                <p className="text-sm text-[#C97B63] font-medium">
                  {formatDayLabel(day.nextDate.date)}
                </p>
                <p className="text-xs text-[#3E2F22]/50 mt-0.5">
                  Toutes les box · {day.slots[0]}–{day.slots[day.slots.length - 1]}
                </p>
              </div>
              <span className="text-[#C97B63] text-lg">→</span>
            </div>
          </button>
        ))}

        <div className="mt-2 border-t border-dashed border-[#3E2F22]/10 pt-4">
          <button
            onClick={() => onSelectDay("batch")}
            className="w-full bg-white rounded-2xl p-5 shadow-sm border border-[#3E2F22]/5 text-left active:scale-[0.98] transition mb-3"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-[#FBF3E7] flex items-center justify-center text-3xl shrink-0">
                🍱
              </div>
              <div className="flex-1">
                <p className="text-base font-semibold text-[#3E2F22]" style={{ fontFamily: "'Fraunces', serif" }}>
                  Batch cooking
                </p>
                <p className="text-sm text-[#C97B63] font-medium">
                  {formatDayLabel(batchDate.date)}
                </p>
                <p className="text-xs text-[#3E2F22]/50 mt-0.5">
                  Repas de la semaine · {BATCH_WINDOW_LABEL} · à emporter ou livré
                </p>
              </div>
              <span className="text-[#C97B63] text-lg">→</span>
            </div>
          </button>
          <button
            onClick={() => onSelectDay("devis")}
            className="w-full bg-[#5B6B4F]/10 rounded-2xl p-5 text-left active:scale-[0.98] transition border border-[#5B6B4F]/20"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-[#5B6B4F]/10 flex items-center justify-center text-3xl shrink-0">
                🎉
              </div>
              <div className="flex-1">
                <p className="text-base font-semibold text-[#3E2F22]" style={{ fontFamily: "'Fraunces', serif" }}>
                  Événement privatif
                </p>
                <p className="text-xs text-[#3E2F22]/50 mt-0.5">
                  Demandez votre devis personnalisé
                </p>
              </div>
              <span className="text-[#5B6B4F] text-lg">→</span>
            </div>
          </button>
        </div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Écran Devis événement
// ---------------------------------------------------------------------------
function DevisScreen({ onBack }) {
  const [form, setForm] = useState({ nom: "", prenom: "", telephone: "" });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(false);

  const isValid = form.nom.trim().length >= 2 && form.prenom.trim().length >= 2 &&
    form.telephone.trim().replace(/\s/g, "").length >= 10;

  const handleSubmit = async () => {
    setSending(true);
    setError(false);
    try {
      const id = Math.random().toString(36).slice(2, 8).toUpperCase();
      await window.storage.set(`devis:${id}`, JSON.stringify({
        ...form,
        id,
        createdAt: new Date().toISOString(),
      }), true);
      // Notification push
      try {
        await fetch("https://ntfy.sh/", {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: "mgmr-brunch82-cmd9k2",
            title: "Demande de devis événement",
            message: `${form.prenom} ${form.nom} - ${form.telephone}`,
            priority: 4,
            tags: ["tada"],
          }),
        });
      } catch (e) {}
      setSent(true);
    } catch (e) {
      setError(true);
    }
    setSending(false);
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-[#FBF3E7] flex flex-col items-center px-6 pt-20 pb-10">
        <StampRing size={110}>
          <Check className="w-7 h-7 text-[#5B6B4F]" strokeWidth={2.5} />
        </StampRing>
        <h2 className="text-2xl text-[#3E2F22] mt-5 text-center" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600 }}>
          Demande envoyée !
        </h2>
        <p className="text-lg text-[#C97B63] mt-1" style={{ fontFamily: "'Caveat', cursive" }}>
          On vous recontacte très vite 🎉
        </p>
        <p className="text-sm text-[#3E2F22]/60 text-center mt-4 max-w-xs">
          Merci {form.prenom} ! Votre demande de devis a bien été transmise à MGMR Brunch & Événement.
        </p>
        <button onClick={onBack} className="mt-10 text-sm text-[#5B6B4F] underline underline-offset-2">
          Retour à l'accueil
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF3E7] pb-28">
      <header className="px-5 pt-6 pb-4 flex items-center gap-3">
        <button onClick={onBack} className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
          <ArrowLeft className="w-4 h-4 text-[#3E2F22]" />
        </button>
        <div>
          <h2 className="text-lg text-[#3E2F22]" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600 }}>
            Demande de devis
          </h2>
          <p className="text-xs text-[#3E2F22]/50">Événement privatif · sur mesure</p>
        </div>
      </header>

      <main className="px-5 flex flex-col gap-4">
        <div className="bg-[#5B6B4F]/10 rounded-xl px-3 py-3 text-xs text-[#5B6B4F]">
          Remplissez ce formulaire et nous vous recontacterons pour préparer ensemble votre événement.
        </div>

        {["prenom", "nom", "telephone"].map((field) => (
          <div key={field} className="bg-white rounded-2xl p-4 shadow-sm border border-[#3E2F22]/5">
            <label className="text-xs uppercase tracking-wide text-[#5B6B4F] block mb-2">
              {field === "prenom" ? "Prénom" : field === "nom" ? "Nom" : "Numéro de téléphone"}
            </label>
            <input
              type={field === "telephone" ? "tel" : "text"}
              inputMode={field === "telephone" ? "tel" : "text"}
              value={form[field]}
              onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
              placeholder={field === "prenom" ? "Camille" : field === "nom" ? "Dupont" : "06 12 34 56 78"}
              className="w-full text-sm text-[#3E2F22] bg-[#FBF3E7] rounded-xl px-3 py-2.5 outline-none border border-transparent focus:border-[#C97B63]/40"
            />
          </div>
        ))}

        {error && (
          <p className="text-xs text-red-500 text-center">Une erreur s'est produite. Réessayez.</p>
        )}
      </main>

      <div className="fixed bottom-5 left-0 right-0 px-5">
        <button
          onClick={handleSubmit}
          disabled={!isValid || sending}
          className="w-full max-w-md mx-auto flex items-center justify-center gap-2 bg-[#5B6B4F] text-white rounded-full py-3.5 shadow-lg active:scale-[0.98] transition disabled:opacity-40"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          <span className="text-sm font-semibold">
            {sending ? "Envoi en cours…" : "Envoyer ma demande"}
          </span>
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Écran Menu (vitrine client)
// ---------------------------------------------------------------------------
function MenuScreen({ cart, weeklyContent, onAdd, onRemove, onGoCart, onOpenAdmin, orderWindow, selectedDay, selectedDayData, onBack }) {
  const totalCount = useMemo(() => Object.values(cart).reduce((a, b) => a + b.qty, 0), [cart]);
  const isOpen = orderWindow.isOpen;
  const targetDayLabel = selectedDayData ? formatDayLabel(selectedDayData.nextDate.date) : "";

  const nextOpeningLabel = null; // ouvert 7j/7 si un jour est actif

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
            Brunch & Événement
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
        {isOpen && selectedDayData && (
          <p className="text-center text-xs text-[#5B6B4F] mb-3">
            Retrait {targetDayLabel ? targetDayLabel.toLowerCase() : ""}
            {selectedDayData.slots.length > 0 ? ` · ${selectedDayData.slots[0]}–${selectedDayData.slots[selectedDayData.slots.length-1]}` : ""}
          </p>
        )}

        <SectionEyebrow>Les box de la semaine</SectionEyebrow>
        <div className="mt-5 flex flex-col gap-4">
          {FORMULAS.map((formula) => {
            const qty = cart[formula.id]?.qty || 0;
            const items = weeklyContent[formula.id]?.length ? weeklyContent[formula.id] : formula.defaultItems;
            return (
              <div key={formula.id} className="bg-white rounded-2xl p-4 shadow-sm border border-[#3E2F22]/5">

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
function AdminScreen({ weeklyContent, onBack, onSave, onOpenOrders, blockedDates, onSaveBlocked, schedule, onSaveSchedule, openDates, onSaveOpenDates }) {
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
  const [newBlockedDate, setNewBlockedDate] = useState("");
  const [monthOffset, setMonthOffset] = useState(0);

  const weekend = useMemo(() => getWeekendDates(monthOffset), [monthOffset]);
  const monthLabel = useMemo(() => {
    const s = weekend.monthDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    return s.charAt(0).toUpperCase() + s.slice(1);
  }, [weekend]);

  const defaultSlotsFor = (jsDay) =>
    jsDay === 6 ? DEFAULT_SCHEDULE.samedi.slots : DEFAULT_SCHEDULE.dimanche.slots;

  const handleToggleOpenDate = (d) => {
    const next = { ...openDates };
    if (next[d.iso] !== undefined) {
      delete next[d.iso];
    } else {
      next[d.iso] = defaultSlotsFor(d.jsDay);
    }
    onSaveOpenDates(next);
  };

  const handleOpenDateSlots = (iso, value) => {
    onSaveOpenDates({ ...openDates, [iso]: value });
  };

  const handleOpenAllWeekends = () => {
    const next = { ...openDates };
    weekend.dates.forEach((d) => {
      if (next[d.iso] === undefined) next[d.iso] = defaultSlotsFor(d.jsDay);
    });
    onSaveOpenDates(next);
  };

  const handleCloseAllWeekends = () => {
    const next = { ...openDates };
    weekend.dates.forEach((d) => delete next[d.iso]);
    onSaveOpenDates(next);
  };

  const handleAddBlocked = () => {
    if (!newBlockedDate) return;
    const updated = [...new Set([...blockedDates, newBlockedDate])].sort();
    onSaveBlocked(updated);
    setNewBlockedDate("");
  };

  const handleRemoveBlocked = (date) => {
    onSaveBlocked(blockedDates.filter((d) => d !== date));
  };

  const handleToggleDay = (key) => {
    const updated = { ...schedule, [key]: { ...schedule[key], active: !schedule[key]?.active } };
    onSaveSchedule(updated);
  };

  const handleSlotsChange = (key, value) => {
    const updated = { ...schedule, [key]: { ...schedule[key], slots: value } };
    onSaveSchedule(updated);
  };

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

        {/* Week-ends ouverts : on choisit date par date */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#3E2F22]/5">
          <h3 className="text-sm text-[#3E2F22] font-semibold mb-1" style={{ fontFamily: "'Fraunces', serif" }}>
            🗓️ Week-ends ouverts
          </h3>
          <p className="text-xs text-[#3E2F22]/50 mb-3">
            Active les samedis et dimanches où tu proposes des box, et ajuste les créneaux de chaque date (séparés par des virgules).
          </p>

          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setMonthOffset(0)}
              className={`flex-1 text-xs font-medium rounded-full py-2 transition ${monthOffset === 0 ? "bg-[#5B6B4F] text-white" : "bg-[#FBF3E7] text-[#3E2F22]/60"}`}
            >
              Ce mois-ci
            </button>
            <button
              onClick={() => setMonthOffset(1)}
              className={`flex-1 text-xs font-medium rounded-full py-2 transition ${monthOffset === 1 ? "bg-[#5B6B4F] text-white" : "bg-[#FBF3E7] text-[#3E2F22]/60"}`}
            >
              Mois suivant
            </button>
          </div>

          <p className="text-xs text-[#5B6B4F] font-medium mb-2">{monthLabel}</p>

          {weekend.dates.length === 0 ? (
            <p className="text-xs text-[#3E2F22]/40">Plus de week-end à venir ce mois-ci.</p>
          ) : (
            <>
              <div className="flex gap-2 mb-3">
                <button
                  onClick={handleOpenAllWeekends}
                  className="flex-1 text-xs font-medium text-[#3E2F22] bg-[#FBF3E7] rounded-full py-2 active:scale-95 transition"
                >
                  Tout ouvrir
                </button>
                <button
                  onClick={handleCloseAllWeekends}
                  className="flex-1 text-xs font-medium text-[#3E2F22]/60 bg-[#FBF3E7] rounded-full py-2 active:scale-95 transition"
                >
                  Tout fermer
                </button>
              </div>
              <div className="flex flex-col gap-3">
                {weekend.dates.map((d) => {
                  const isActive = openDates[d.iso] !== undefined;
                  return (
                    <div key={d.iso} className="border border-[#3E2F22]/8 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-[#3E2F22] font-medium">
                          {formatDayLabel(d.date)} {d.emoji}
                        </p>
                        <button
                          onClick={() => handleToggleOpenDate(d)}
                          aria-label={`Ouvrir ou fermer ${formatDayLabel(d.date)}`}
                          className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${isActive ? "bg-[#5B6B4F]" : "bg-[#3E2F22]/20"}`}
                        >
                          <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isActive ? "translate-x-6" : "translate-x-0.5"}`} />
                        </button>
                      </div>
                      {isActive && (
                        <input
                          type="text"
                          value={openDates[d.iso]}
                          onChange={(e) => handleOpenDateSlots(d.iso, e.target.value)}
                          placeholder="10h00, 10h30, 11h00"
                          className="w-full text-xs text-[#3E2F22] bg-[#FBF3E7] rounded-lg px-3 py-2 outline-none border border-transparent focus:border-[#C97B63]/40"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Planning lundi → vendredi */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#3E2F22]/5">
          <h3 className="text-sm text-[#3E2F22] font-semibold mb-3" style={{ fontFamily: "'Fraunces', serif" }}>
            📆 Jours de semaine (lundi → vendredi)
          </h3>
          <p className="text-xs text-[#3E2F22]/50 mb-4">
            Active les jours de retrait en semaine et saisis les créneaux séparés par des virgules (ex: 10h00, 10h30, 11h00). Les week-ends se gèrent date par date juste au-dessus.
          </p>
          <div className="flex flex-col gap-4">
            {WEEK_DAYS.filter((d) => d.jsDay !== 0 && d.jsDay !== 6).map((day) => {
              const cfg = schedule[day.key] || { active: false, slots: "" };
              return (
                <div key={day.key} className="border border-[#3E2F22]/8 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-[#3E2F22] font-medium">{day.label} {day.emoji}</p>
                    <button
                      onClick={() => handleToggleDay(day.key)}
                      className={`w-12 h-6 rounded-full transition-colors relative ${cfg.active ? "bg-[#5B6B4F]" : "bg-[#3E2F22]/20"}`}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${cfg.active ? "translate-x-6" : "translate-x-0.5"}`} />
                    </button>
                  </div>
                  {cfg.active && (
                    <input
                      type="text"
                      value={cfg.slots}
                      onChange={(e) => handleSlotsChange(day.key, e.target.value)}
                      placeholder="10h00, 10h30, 11h00"
                      className="w-full text-xs text-[#3E2F22] bg-[#FBF3E7] rounded-lg px-3 py-2 outline-none border border-transparent focus:border-[#C97B63]/40"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Section jours sans box */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#3E2F22]/5">
          <h3 className="text-sm text-[#3E2F22] font-semibold mb-3" style={{ fontFamily: "'Fraunces', serif" }}>
            📅 Jours sans box (semaine)
          </h3>
          <p className="text-xs text-[#3E2F22]/50 mb-3">
            Ajoute les dates des jours de semaine sans box. Les commandes seront automatiquement redirigées vers la date suivante disponible.
          </p>
          <div className="flex gap-2 mb-3">
            <input
              type="date"
              value={newBlockedDate}
              onChange={(e) => setNewBlockedDate(e.target.value)}
              className="flex-1 text-sm text-[#3E2F22] bg-[#FBF3E7] rounded-xl px-3 py-2 outline-none border border-transparent focus:border-[#C97B63]/40"
            />
            <button
              onClick={handleAddBlocked}
              disabled={!newBlockedDate}
              className="bg-[#C97B63] text-white text-sm font-medium px-3 py-2 rounded-xl active:scale-95 transition disabled:opacity-40"
            >
              Ajouter
            </button>
          </div>
          {blockedDates.length === 0 ? (
            <p className="text-xs text-[#3E2F22]/40">Aucun jour bloqué.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {blockedDates.map((date) => (
                <div key={date} className="flex items-center justify-between bg-[#FBF3E7] rounded-xl px-3 py-2">
                  <span className="text-sm text-[#3E2F22]">
                    {new Date(date + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  </span>
                  <button
                    onClick={() => handleRemoveBlocked(date)}
                    className="text-red-400 text-xs active:scale-95 transition ml-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
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
function CartScreen({ cart, firstName, onFirstNameChange, phone, onPhoneChange, onBack, onAdd, onRemove, onNext, extras, onAddExtra, onRemoveExtra }) {
  const items = Object.entries(cart).filter(([, v]) => v.qty > 0);
  const total = items.reduce((sum, [id, v]) => {
    const formula = FORMULAS.find((f) => f.id === id);
    return sum + formula.price * v.qty;
  }, 0) + optionsTotal(extras);
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
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#3E2F22]/5">
              <p className="text-xs uppercase tracking-wide text-[#5B6B4F] mb-3">Options à ajouter</p>
              <div className="flex flex-col gap-3">
                {OPTIONS.map((o) => {
                  const q = extras[o.id] || 0;
                  return (
                    <div key={o.id} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#3E2F22]">{o.name}</p>
                        <p className="text-xs text-[#C97B63] font-medium">{o.price.toFixed(2)} €</p>
                      </div>
                      {q === 0 ? (
                        <button
                          onClick={() => onAddExtra(o.id)}
                          className="shrink-0 w-8 h-8 rounded-full bg-[#C97B63] text-white flex items-center justify-center active:scale-95 transition"
                          aria-label={`Ajouter ${o.name}`}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      ) : (
                        <div className="shrink-0 flex items-center gap-1.5 bg-[#FBF3E7] rounded-full px-1 py-1">
                          <button onClick={() => onRemoveExtra(o.id)} className="w-7 h-7 rounded-full bg-white text-[#3E2F22] flex items-center justify-center active:scale-95">
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-4 text-center text-sm font-semibold text-[#3E2F22]">{q}</span>
                          <button onClick={() => onAddExtra(o.id)} className="w-7 h-7 rounded-full bg-[#C97B63] text-white flex items-center justify-center active:scale-95">
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

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
// Écran Créneau (+ option livraison)
// ---------------------------------------------------------------------------
function SlotScreen({
  onBack, selectedSlot, onSelectSlot, onConfirm, dayLabel, daySlots,
  boxAlreadyBooked, boxInCart, loadingCapacity,
  deliveryMode, onToggleDelivery, addressForm, onAddressFormChange, deliveryError, checkingDelivery, deliveryInfo,
}) {
  const remaining = WEEKLY_BOX_LIMIT - boxAlreadyBooked;
  const wouldExceed = boxInCart > remaining;
  const isFull = remaining <= 0;
  const activeSlots = daySlots || [];
  const creneauxLabel = activeSlots.length > 0
    ? `Créneaux · ${activeSlots[0]}–${activeSlots[activeSlots.length-1]}`
    : "Créneaux à définir";
  const setField = (k, v) => onAddressFormChange({ ...addressForm, [k]: v });
  const addressValid =
    addressForm.street.trim().length >= 3 &&
    /^\d{5}$/.test(addressForm.postcode.trim()) &&
    addressForm.city.trim().length >= 2;
  const missingAddress = deliveryMode && !addressValid;

  return (
    <div className="min-h-screen bg-[#FBF3E7] pb-28">
      <header className="px-5 pt-6 pb-4 flex items-center gap-3">
        <button onClick={onBack} className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm" aria-label="Retour au panier">
          <ArrowLeft className="w-4 h-4 text-[#3E2F22]" />
        </button>
        <h2 className="text-lg text-[#3E2F22]" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600 }}>
          {deliveryMode ? "Heure de livraison" : "Heure de retrait"}
        </h2>
      </header>

      <main className="px-5">
        <p className="text-sm text-[#3E2F22]/60 mb-1">
          {deliveryMode
            ? `Livraison à votre adresse, ${dayLabel ? dayLabel.toLowerCase() : "ce jour"}. Pas d'heure à choisir.`
            : `Retrait sur place, ${dayLabel ? dayLabel.toLowerCase() : "ce jour"}.`}
        </p>
        {!deliveryMode && <p className="text-xs text-[#5B6B4F] mb-1">{creneauxLabel}</p>}

        {loadingCapacity ? (
          <p className="text-xs text-[#3E2F22]/40 mb-5">Vérification des places disponibles…</p>
        ) : isFull ? (
          <div className="bg-[#C97B63]/10 rounded-xl px-3 py-2.5 text-xs text-[#C97B63] mb-5">
            Complet pour ce jour — toutes les box ont déjà été réservées !
          </div>
        ) : (
          <p className="text-xs text-[#5B6B4F] mb-5">
            {remaining} box restantes sur {WEEKLY_BOX_LIMIT} pour ce jour
          </p>
        )}

        {!isFull && wouldExceed && (
          <div className="bg-[#C97B63]/10 rounded-xl px-3 py-2.5 text-xs text-[#C97B63] mb-5">
            Il ne reste que {remaining} box disponible{remaining > 1 ? "s" : ""} — réduisez les quantités dans votre panier.
          </div>
        )}

        {!deliveryMode && (
        <div className="grid grid-cols-3 gap-2.5">
          {activeSlots.map((slot) => {
            const isSelected = selectedSlot === slot;
            const disabled = isFull || wouldExceed || loadingCapacity;
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
        )}

        {/* Option livraison */}
        <div className={`${deliveryMode ? "mt-2" : "mt-6 pt-5 border-t border-dashed border-[#3E2F22]/10"}`}>
          <button
            onClick={() => onToggleDelivery(!deliveryMode)}
            className={`w-full flex items-center justify-center gap-2 rounded-full py-3 text-sm font-medium border transition active:scale-[0.98] ${
              deliveryMode
                ? "bg-[#5B6B4F] text-white border-[#5B6B4F] shadow-md"
                : "bg-white text-[#3E2F22] border-[#3E2F22]/10"
            }`}
          >
            <Truck className="w-4 h-4" />
            {deliveryMode ? "Livraison choisie · toucher pour annuler" : "Je souhaite être livré(e)"}
          </button>

          {deliveryMode && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#3E2F22]/5 mt-3">
              <label className="flex items-center gap-2 text-xs uppercase tracking-wide text-[#5B6B4F] mb-2">
                <MapPin className="w-3.5 h-3.5" />
                Adresse de livraison
              </label>
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  value={addressForm.street}
                  onChange={(e) => setField("street", e.target.value)}
                  placeholder="N° et nom de rue"
                  className="w-full text-sm text-[#3E2F22] bg-[#FBF3E7] rounded-xl px-3 py-2.5 outline-none border border-transparent focus:border-[#C97B63]/40"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={5}
                    value={addressForm.postcode}
                    onChange={(e) => setField("postcode", e.target.value.replace(/\D/g, ""))}
                    placeholder="Code postal"
                    className="w-28 shrink-0 text-sm text-[#3E2F22] bg-[#FBF3E7] rounded-xl px-3 py-2.5 outline-none border border-transparent focus:border-[#C97B63]/40"
                  />
                  <input
                    type="text"
                    value={addressForm.city}
                    onChange={(e) => setField("city", e.target.value)}
                    placeholder="Ville"
                    className="w-full text-sm text-[#3E2F22] bg-[#FBF3E7] rounded-xl px-3 py-2.5 outline-none border border-transparent focus:border-[#C97B63]/40"
                  />
                </div>
                <input
                  type="text"
                  value={addressForm.notes}
                  onChange={(e) => setField("notes", e.target.value)}
                  placeholder="Étage, digicode… (facultatif)"
                  className="w-full text-sm text-[#3E2F22] bg-[#FBF3E7] rounded-xl px-3 py-2.5 outline-none border border-transparent focus:border-[#C97B63]/40"
                />
              </div>
              <p className="text-[11px] text-[#3E2F22]/45 mt-2">
                Offerte à Bessens · {DELIVERY_FEE_NEAR} € jusqu'à {DELIVERY_NEAR_KM} km · {DELIVERY_FEE_FAR} € de {DELIVERY_NEAR_KM} à {DELIVERY_MAX_KM} km.
              </p>
              {deliveryInfo?.status === "checking" && (
                <p className="text-xs text-[#3E2F22]/50 mt-2">Calcul des frais de livraison…</p>
              )}
              {deliveryInfo?.status === "ok" && !deliveryError && (
                <div className="mt-2 bg-[#5B6B4F]/10 rounded-lg px-3 py-2 text-xs text-[#5B6B4F] font-medium">
                  {deliveryInfo.fee > 0
                    ? `Frais de livraison : ${deliveryInfo.fee.toFixed(2)} € (${Math.round(deliveryInfo.km)} km)`
                    : "Livraison offerte à Bessens 🎉"}
                </div>
              )}
              {(deliveryError || (deliveryInfo && deliveryInfo.status !== "ok" && deliveryInfo.status !== "checking")) && (
                <p className="text-xs text-red-500 mt-2">{deliveryError || deliveryInfo.message}</p>
              )}
            </div>
          )}
        </div>
      </main>

      <div className="fixed bottom-5 left-0 right-0 px-5">
        <button
          onClick={onConfirm}
          disabled={(!deliveryMode && !selectedSlot) || isFull || wouldExceed || missingAddress || checkingDelivery || (deliveryMode && ["checking", "toofar", "notfound"].includes(deliveryInfo?.status))}
          className="w-full max-w-md mx-auto flex items-center justify-center gap-2 bg-[#C97B63] text-white rounded-full py-3.5 shadow-lg active:scale-[0.98] transition disabled:opacity-40 disabled:active:scale-100"
        >
          {checkingDelivery ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          <span className="text-sm font-semibold">
            {checkingDelivery ? "Vérification de l'adresse…" : deliveryMode ? "Confirmer la livraison" : selectedSlot ? `Confirmer pour ${selectedSlot}` : "Choisissez un créneau"}
          </span>
        </button>
        {missingAddress && (
          <p className="text-center text-xs text-[#3E2F22]/50 mt-2">
            Indiquez votre adresse de livraison pour continuer
          </p>
        )}
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
  }, 0) + (order.batch?.price || 0) + (order.extrasTotal || 0) + (order.deliveryFee || 0);

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
          <span className="text-xs uppercase tracking-wide text-[#5B6B4F]">
            {order.delivery ? "Livraison" : "Retrait à emporter"}
          </span>
          <span className="text-base font-semibold text-[#3E2F22] text-right" style={{ fontFamily: "'Fraunces', serif" }}>
            {[order.dayLabel, order.slot].filter(Boolean).join(" · ")}
          </span>
        </div>

        {order.delivery && (
          <div className="flex items-start justify-between gap-3 py-2.5 border-b border-dashed border-[#3E2F22]/15">
            <span className="text-xs text-[#3E2F22]/50 flex items-center gap-1.5 shrink-0">
              <MapPin className="w-3 h-3" />
              Adresse
            </span>
            <span className="text-sm text-[#3E2F22] text-right whitespace-pre-line">{order.address}</span>
          </div>
        )}

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
          {order.batch && (
            <div className="flex items-start justify-between gap-2">
              <span className="text-sm text-[#3E2F22] font-medium">{order.batch.label}</span>
              <span className="text-sm text-[#3E2F22]/70 shrink-0">{order.batch.price.toFixed(2)} €</span>
            </div>
          )}
          {(order.extras || []).map((e) => (
            <div key={e.id} className="flex items-start justify-between gap-2">
              <span className="text-sm text-[#3E2F22] font-medium">{e.qty}× {e.name}</span>
              <span className="text-sm text-[#3E2F22]/70 shrink-0">{(e.price * e.qty).toFixed(2)} €</span>
            </div>
          ))}
          {order.delivery && (
            <div className="flex items-start justify-between gap-2">
              <span className="text-sm text-[#3E2F22] font-medium">Livraison</span>
              <span className="text-sm text-[#3E2F22]/70 shrink-0">
                {order.deliveryFee > 0 ? `${order.deliveryFee.toFixed(2)} €` : "Offerte"}
              </span>
            </div>
          )}
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
        {order.delivery
          ? `${order.batch ? "Vos repas vous seront livrés" : "Votre box vous sera livrée"} à l'adresse indiquée.`
          : `Présentez-vous à l'heure indiquée, ${order.batch ? "vos repas vous attendront" : "votre box vous attendra"}.`}
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

  const sorted = [...orders].sort((a, b) =>
    `${a.dayIso || ""} ${a.slot || ""}`.localeCompare(`${b.dayIso || ""} ${b.slot || ""}`)
  );
  const totalDue = orders.filter((o) => !o.paid).reduce((sum, o) => sum + o.total, 0);

  const handleCopy = (order) => {
    const text = `MGMR Brunch & Événement — Commande ${order.id}\n${order.firstName ? `Client : ${order.firstName}\n` : ""}${order.lines.join("\n")}\nTotal : ${order.total.toFixed(2)} €\n${order.delivery ? "Livraison" : "Retrait"} : ${[order.dayLabel, order.slot].filter(Boolean).join(" · ")}${order.delivery ? `\nAdresse : ${order.address}` : ""}\nTél : ${order.phone}`;
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
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-[#3E2F22]" style={{ fontFamily: "'Fraunces', serif" }}>
                  {[order.dayLabel, order.slot].filter(Boolean).join(" · ") || "—"}
                </span>
                <span className="text-[10px] text-[#3E2F22]/40">#{order.id}</span>
              </div>
              <span
                className={`text-[10px] uppercase tracking-wide px-2 py-1 rounded-full font-medium shrink-0 ${
                  order.paid ? "bg-[#5B6B4F]/15 text-[#5B6B4F]" : "bg-[#C97B63]/15 text-[#C97B63]"
                }`}
              >
                {order.paid ? "Payée" : "En attente"}
              </span>
            </div>

            {order.delivery && (
              <div className="mt-2 flex items-start gap-1.5 bg-[#5B6B4F]/10 rounded-lg px-2.5 py-2 text-xs text-[#5B6B4F]">
                <Truck className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span className="whitespace-pre-line">Livraison · {order.address}{order.deliveryKm ? ` (${order.deliveryKm} km)` : ""}</span>
              </div>
            )}

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
// Écran Batch cooking
// ---------------------------------------------------------------------------
function BatchScreen({ onBack, batchDate, onConfirm }) {
  const [formulaId, setFormulaId] = useState(null);
  const [notes, setNotes] = useState("");
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [deliveryMode, setDeliveryMode] = useState(false);
  const [slot, setSlot] = useState(null);
  const [addressForm, setAddressForm] = useState({ street: "", postcode: "", city: "", notes: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const deliveryInfo = useDeliveryCheck(deliveryMode, addressForm);

  const allOptions = useMemo(
    () => BATCH_GROUPS.flatMap((g) => g.options.map((o) => ({ ...o, group: g.title }))),
    []
  );
  const formula = allOptions.find((o) => o.id === formulaId) || null;
  const fee = deliveryMode && deliveryInfo?.status === "ok" ? deliveryInfo.fee : 0;
  const total = formula ? formula.price + fee : 0;

  const phoneValid = phone.trim().replace(/\s/g, "").length >= 10;
  const nameValid = firstName.trim().length >= 2;
  const addressOk = !deliveryMode || isAddressValid(addressForm);
  const slotOk = deliveryMode || !!slot;
  const blocked = deliveryMode && ["checking", "toofar", "notfound"].includes(deliveryInfo?.status);
  const canSubmit = !!formula && nameValid && phoneValid && addressOk && slotOk && !blocked && !submitting;

  const setField = (k, v) => {
    setAddressForm((f) => ({ ...f, [k]: v }));
    setError("");
  };

  const inputCls = "w-full text-sm text-[#3E2F22] bg-[#FBF3E7] rounded-xl px-3 py-2.5 outline-none border border-transparent focus:border-[#C97B63]/40";

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    let deliveryKm = null;
    let deliveryFee = 0;
    let addressString = "";
    if (deliveryMode) {
      addressString = [
        `${addressForm.street.trim()}, ${addressForm.postcode.trim()} ${addressForm.city.trim()}`,
        addressForm.notes.trim(),
      ].filter(Boolean).join("\n");
      const res = await checkDeliveryAddress(addressForm);
      if (res.status !== "ok") {
        setError(res.message);
        setSubmitting(false);
        return;
      }
      deliveryKm = res.km;
      deliveryFee = res.fee;
    }
    await onConfirm({
      formula,
      notes: notes.trim(),
      firstName: firstName.trim(),
      phone: phone.trim(),
      delivery: deliveryMode,
      slot: deliveryMode ? "" : slot,
      address: addressString,
      deliveryKm,
      deliveryFee,
    });
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-[#FBF3E7] pb-32">
      <header className="px-5 pt-6 pb-4 flex items-center gap-3">
        <button onClick={onBack} className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm" aria-label="Retour">
          <ArrowLeft className="w-4 h-4 text-[#3E2F22]" />
        </button>
        <div>
          <h2 className="text-lg text-[#3E2F22]" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600 }}>
            Batch cooking
          </h2>
          <p className="text-xs text-[#3E2F22]/50">
            {formatDayLabel(batchDate.date)} · {BATCH_WINDOW_LABEL}
          </p>
        </div>
      </header>

      <main className="px-5 flex flex-col gap-4">
        <div className="bg-[#5B6B4F]/10 rounded-xl px-3 py-2.5 text-xs text-[#5B6B4F]">
          Vos repas de la semaine, préparés maison. Retrait ou livraison le lundi entre 17h00 et 18h30.
        </div>

        {BATCH_GROUPS.map((group) => (
          <div key={group.title} className="bg-white rounded-2xl p-4 shadow-sm border border-[#3E2F22]/5">
            <h3 className="text-sm text-[#3E2F22] font-semibold" style={{ fontFamily: "'Fraunces', serif" }}>
              {group.title}
            </h3>
            <p className="text-xs text-[#3E2F22]/50 mb-3">{group.note}</p>
            <div className="flex flex-col gap-2">
              {group.options.map((o) => {
                const selected = formulaId === o.id;
                return (
                  <button
                    key={o.id}
                    onClick={() => setFormulaId(o.id)}
                    className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm border transition active:scale-[0.98] ${
                      selected
                        ? "bg-[#5B6B4F] text-white border-[#5B6B4F] shadow-md"
                        : "bg-[#FBF3E7] text-[#3E2F22] border-transparent"
                    }`}
                  >
                    <span className="text-left">{o.label}</span>
                    <span className={`font-semibold ${selected ? "text-white" : "text-[#C97B63]"}`}>{o.price} €</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#3E2F22]/5">
          <h3 className="text-sm text-[#3E2F22] font-semibold mb-3" style={{ fontFamily: "'Fraunces', serif" }}>
            Les plats
          </h3>
          <ol className="grid grid-cols-1 gap-1">
            {BATCH_DISHES.map((d, i) => (
              <li key={d} className="text-xs text-[#3E2F22]/70 flex gap-2">
                <span className="text-[#C97B63] w-5 shrink-0 text-right">{i + 1}.</span>
                <span>{d}</span>
              </li>
            ))}
          </ol>
          <label className="block text-xs uppercase tracking-wide text-[#5B6B4F] mt-4 mb-2">
            Vos plats souhaités / remarques (facultatif)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Ex : 2 lasagnes, 1 poulet coco-curry… ou allergies"
            className={`${inputCls} resize-none`}
          />
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#3E2F22]/5">
          <label className="block text-xs uppercase tracking-wide text-[#5B6B4F] mb-2">Votre prénom</label>
          <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Camille" className={inputCls} />
          <label className="flex items-center gap-2 text-xs uppercase tracking-wide text-[#5B6B4F] mt-4 mb-2">
            <Phone className="w-3.5 h-3.5" />
            Votre numéro de téléphone
          </label>
          <input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="06 12 34 56 78" className={inputCls} />
          <p className="text-[11px] text-[#3E2F22]/45 mt-1.5">On vous envoie le lien de paiement par SMS ou WhatsApp.</p>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#3E2F22]/5">
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              onClick={() => { setDeliveryMode(false); setError(""); }}
              className={`flex items-center justify-center gap-2 rounded-full py-2.5 text-sm font-medium border transition ${
                !deliveryMode ? "bg-[#5B6B4F] text-white border-[#5B6B4F]" : "bg-[#FBF3E7] text-[#3E2F22] border-transparent"
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              À emporter
            </button>
            <button
              onClick={() => { setDeliveryMode(true); setError(""); }}
              className={`flex items-center justify-center gap-2 rounded-full py-2.5 text-sm font-medium border transition ${
                deliveryMode ? "bg-[#5B6B4F] text-white border-[#5B6B4F]" : "bg-[#FBF3E7] text-[#3E2F22] border-transparent"
              }`}
            >
              <Truck className="w-4 h-4" />
              Livraison
            </button>
          </div>

          {!deliveryMode ? (
            <>
              <p className="text-xs text-[#5B6B4F] mb-3">Heure de retrait · {BATCH_WINDOW_LABEL}</p>
              <div className="grid grid-cols-3 gap-2.5">
                {BATCH_SLOTS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSlot(s)}
                    className={`rounded-xl py-3 text-sm font-medium border transition ${
                      slot === s
                        ? "bg-[#5B6B4F] text-white border-[#5B6B4F] shadow-md"
                        : "bg-white text-[#3E2F22] border-[#3E2F22]/10 active:scale-95"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-[#5B6B4F] mb-3">Livraison le lundi entre 17h00 et 18h30 (pas d'heure à choisir).</p>
              <label className="flex items-center gap-2 text-xs uppercase tracking-wide text-[#5B6B4F] mb-2">
                <MapPin className="w-3.5 h-3.5" />
                Adresse de livraison
              </label>
              <div className="flex flex-col gap-2">
                <input type="text" value={addressForm.street} onChange={(e) => setField("street", e.target.value)} placeholder="N° et nom de rue" className={inputCls} />
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={5}
                    value={addressForm.postcode}
                    onChange={(e) => setField("postcode", e.target.value.replace(/\D/g, ""))}
                    placeholder="Code postal"
                    className="w-28 shrink-0 text-sm text-[#3E2F22] bg-[#FBF3E7] rounded-xl px-3 py-2.5 outline-none border border-transparent focus:border-[#C97B63]/40"
                  />
                  <input type="text" value={addressForm.city} onChange={(e) => setField("city", e.target.value)} placeholder="Ville" className={inputCls} />
                </div>
                <input type="text" value={addressForm.notes} onChange={(e) => setField("notes", e.target.value)} placeholder="Étage, digicode… (facultatif)" className={inputCls} />
              </div>
              <p className="text-[11px] text-[#3E2F22]/45 mt-2">
                Offerte à Bessens · {DELIVERY_FEE_NEAR} € jusqu'à {DELIVERY_NEAR_KM} km · {DELIVERY_FEE_FAR} € de {DELIVERY_NEAR_KM} à {DELIVERY_MAX_KM} km.
              </p>
              {deliveryInfo?.status === "checking" && (
                <p className="text-xs text-[#3E2F22]/50 mt-2">Calcul des frais de livraison…</p>
              )}
              {deliveryInfo?.status === "ok" && !error && (
                <div className="mt-2 bg-[#5B6B4F]/10 rounded-lg px-3 py-2 text-xs text-[#5B6B4F] font-medium">
                  {deliveryInfo.fee > 0
                    ? `Frais de livraison : ${deliveryInfo.fee.toFixed(2)} € (${Math.round(deliveryInfo.km)} km)`
                    : "Livraison offerte à Bessens 🎉"}
                </div>
              )}
              {(error || (deliveryInfo && deliveryInfo.status !== "ok" && deliveryInfo.status !== "checking")) && (
                <p className="text-xs text-red-500 mt-2">{error || deliveryInfo.message}</p>
              )}
            </>
          )}
        </div>
      </main>

      <div className="fixed bottom-5 left-0 right-0 px-5">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full max-w-md mx-auto flex items-center justify-center gap-2 bg-[#C97B63] text-white rounded-full py-3.5 shadow-lg active:scale-[0.98] transition disabled:opacity-40 disabled:active:scale-100"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          <span className="text-sm font-semibold">
            {submitting
              ? "Envoi en cours…"
              : formula
              ? `Réserver · ${total.toFixed(2)} €`
              : "Choisissez une formule"}
          </span>
        </button>
        {formula && (!nameValid || !phoneValid) && (
          <p className="text-center text-xs text-[#3E2F22]/50 mt-2">Entrez votre prénom et votre numéro pour continuer</p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// App racine
// ---------------------------------------------------------------------------
export default function App() {
  const [step, setStep] = useState("loading");
  const [cart, setCart] = useState({});
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null); // clé du jour ex: "lundi" ou date ISO d'un week-end "2026-11-07"
  const [lastOrder, setLastOrder] = useState(null);
  const [weeklyContent, setWeeklyContent] = useState({});
  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [deliveryMode, setDeliveryMode] = useState(false);
  const [addressForm, setAddressForm] = useState({ street: "", postcode: "", city: "", notes: "" });
  const [deliveryError, setDeliveryError] = useState("");
  const [checkingDelivery, setCheckingDelivery] = useState(false);
  const [deliveryInfo, setDeliveryInfo] = useState(null);
  const [extras, setExtras] = useState({});
  const batchDate = useMemo(() => getNextDateForDay(1, blockedDates), [blockedDates]);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [boxAlreadyBooked, setBoxAlreadyBooked] = useState(0);
  const [loadingCapacity, setLoadingCapacity] = useState(false);
  const [blockedDates, setBlockedDates] = useState([]);
  const [schedule, setSchedule] = useState(DEFAULT_SCHEDULE);
  const [openDates, setOpenDates] = useState({});

  const activeDays = useMemo(() => getScheduleWithDates(schedule, blockedDates, openDates), [schedule, blockedDates, openDates]);
  const orderWindow = useMemo(() => ({ isOpen: activeDays.length > 0 }), [activeDays]);
  const selectedDayData = useMemo(() => activeDays.find((d) => d.key === selectedDay) || null, [activeDays, selectedDay]);
  const dayLabel = useMemo(() => selectedDayData ? formatDayLabel(selectedDayData.nextDate.date) : "", [selectedDayData]);
  const daySlots = useMemo(() => selectedDayData?.slots || [], [selectedDayData]);
  const boxInCart = useMemo(() => Object.values(cart).reduce((sum, v) => sum + v.qty, 0), [cart]);

  useEffect(() => {
    (async () => {
      try {
        const result = await window.storage.get(STORAGE_KEY, true);
        if (result?.value) setWeeklyContent(JSON.parse(result.value));
      } catch (e) {}
      try {
        const result = await window.storage.get(BLOCKED_DATES_KEY, true);
        if (result?.value) setBlockedDates(JSON.parse(result.value));
      } catch (e) {}
      try {
        const result = await window.storage.get(SCHEDULE_KEY, true);
        if (result?.value) setSchedule(JSON.parse(result.value));
      } catch (e) {}
      try {
        const result = await window.storage.get(OPEN_DATES_KEY, true);
        if (result?.value) setOpenDates(JSON.parse(result.value));
      } catch (e) {}
      setStep("daypicker");
    })();
  }, []);

  // Vérification automatique de l'adresse (distance + frais) pendant la saisie
  useEffect(() => {
    if (!deliveryMode || !isAddressValid(addressForm)) {
      setDeliveryInfo(null);
      return;
    }
    let cancelled = false;
    setDeliveryInfo({ status: "checking" });
    const t = setTimeout(async () => {
      const res = await checkDeliveryAddress(addressForm);
      if (!cancelled) setDeliveryInfo(res);
    }, 700);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [deliveryMode, addressForm]);

  const handleAdd = (id) => {
    setCart((prev) => ({ ...prev, [id]: { qty: (prev[id]?.qty || 0) + 1 } }));
  };

  const handleAddExtra = (id) => {
    setExtras((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  };

  const handleRemoveExtra = (id) => {
    setExtras((prev) => {
      const current = prev[id] || 0;
      if (current <= 1) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: current - 1 };
    });
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

  const handleSaveBlocked = async (newBlocked) => {
    setBlockedDates(newBlocked);
    try {
      await window.storage.set(BLOCKED_DATES_KEY, JSON.stringify(newBlocked), true);
    } catch (e) {}
  };

  const handleSaveSchedule = async (newSchedule) => {
    setSchedule(newSchedule);
    try {
      await window.storage.set(SCHEDULE_KEY, JSON.stringify(newSchedule), true);
    } catch (e) {}
  };

  const handleSaveOpenDates = async (newOpenDates) => {
    setOpenDates(newOpenDates);
    try {
      await window.storage.set(OPEN_DATES_KEY, JSON.stringify(newOpenDates), true);
    } catch (e) {}
  };

  const handleConfirmOrder = async () => {
    // Sécurité : revérifie que la fenêtre de commande est toujours ouverte.
    if (!getOrderWindowStatus(schedule, openDates).isOpen) {
      setStep("daypicker");
      return;
    }

    // Livraison : vérifie que l'adresse est dans la zone (25 km autour de Bessens)
    let deliveryKm = null;
    let deliveryFee = 0;
    let addressString = "";
    if (deliveryMode) {
      addressString = [
        `${addressForm.street.trim()}, ${addressForm.postcode.trim()} ${addressForm.city.trim()}`,
        addressForm.notes.trim(),
      ].filter(Boolean).join("\n");
      setCheckingDelivery(true);
      setDeliveryError("");
      const res = await checkDeliveryAddress(addressForm);
      setCheckingDelivery(false);
      if (res.status !== "ok") {
        setDeliveryError(res.message);
        return;
      }
      deliveryKm = res.km;
      deliveryFee = res.fee;
    }

    const items = Object.entries(cart).filter(([, v]) => v.qty > 0);
    const itemsTotal = items.reduce((sum, [id, v]) => {
      const formula = FORMULAS.find((f) => f.id === id);
      return sum + formula.price * v.qty;
    }, 0);
    const extraEntries = OPTIONS
      .filter((o) => (extras[o.id] || 0) > 0)
      .map((o) => ({ id: o.id, name: o.name, price: o.price, qty: extras[o.id] }));
    const extrasTotal = extraEntries.reduce((s, e) => s + e.price * e.qty, 0);
    const total = itemsTotal + extrasTotal + deliveryFee;
    const lines = items.map(([id, v]) => {
      const formula = FORMULAS.find((f) => f.id === id);
      return `${v.qty}× ${formula.name}`;
    });
    extraEntries.forEach((e) => lines.push(`${e.qty}× ${e.name} : ${(e.price * e.qty).toFixed(2)} €`));
    if (deliveryMode) {
      lines.push(deliveryFee > 0 ? `Livraison (${deliveryKm} km) : ${deliveryFee.toFixed(2)} €` : "Livraison offerte (Bessens)");
    }

    const order = {
      id: Math.random().toString(36).slice(2, 8).toUpperCase(),
      cart,
      lines,
      total,
      slot: deliveryMode ? "" : selectedSlot,
      dayIso: selectedDayData?.nextDate.iso || "",
      dayLabel,
      dayKey: selectedDay,
      firstName: firstName.trim(),
      phone: phone.trim(),
      delivery: deliveryMode,
      address: addressString,
      deliveryKm,
      deliveryFee,
      extras: extraEntries,
      extrasTotal,
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
          title: `${order.delivery ? "Nouvelle commande LIVRAISON" : "Nouvelle commande"} - ${order.total.toFixed(2)} EUR`,
          message: `${order.firstName || "Client"} - ${order.phone}\n${order.lines.join(", ")}\n${order.delivery ? "Livraison" : "Retrait"} : ${[order.dayLabel, order.slot].filter(Boolean).join(" ")}${order.delivery ? `\nAdresse : ${order.address}` : ""}`,
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

  const handleConfirmBatch = async (b) => {
    const nd = batchDate;
    const dayLabelBatch = formatDayLabel(nd.date);
    const formulaLabel = `Batch cooking · ${b.formula.group} – ${b.formula.label}`;
    const total = b.formula.price + (b.deliveryFee || 0);
    const lines = [`${formulaLabel} : ${b.formula.price.toFixed(2)} €`];
    if (b.notes) lines.push(`Plats souhaités : ${b.notes}`);
    if (b.delivery) {
      lines.push(b.deliveryFee > 0 ? `Livraison (${b.deliveryKm} km) : ${b.deliveryFee.toFixed(2)} €` : "Livraison offerte (Bessens)");
    }
    const order = {
      id: Math.random().toString(36).slice(2, 8).toUpperCase(),
      kind: "batch",
      cart: {},
      lines,
      total,
      slot: b.delivery ? BATCH_WINDOW_LABEL : b.slot,
      dayIso: nd.iso,
      dayLabel: dayLabelBatch,
      dayKey: "batch",
      firstName: b.firstName,
      phone: b.phone,
      delivery: b.delivery,
      address: b.address,
      deliveryKm: b.deliveryKm,
      deliveryFee: b.deliveryFee || 0,
      extras: [],
      extrasTotal: 0,
      batch: { label: formulaLabel, price: b.formula.price },
      paid: false,
      createdAt: new Date().toISOString(),
    };
    try {
      await window.storage.set(`order:${order.id}`, JSON.stringify(order), true);
    } catch (e) {
      console.error("Impossible d'enregistrer la commande", e);
    }
    try {
      await fetch(`https://ntfy.sh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: NTFY_TOPIC,
          title: `Nouvelle réservation BATCH COOKING - ${order.total.toFixed(2)} EUR`,
          message: `${order.firstName || "Client"} - ${order.phone}\n${order.lines.join("\n")}\n${order.delivery ? "Livraison" : "Retrait"} : ${order.dayLabel} ${order.slot}${order.delivery ? `\nAdresse : ${order.address}` : ""}`,
          priority: 5,
          tags: ["bento"],
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
    setExtras({});
    setSelectedSlot(null);
    setSelectedDay(null);
    setPhone("");
    setFirstName("");
    setDeliveryMode(false);
    setAddressForm({ street: "", postcode: "", city: "", notes: "" });
    setDeliveryError("");
    setLastOrder(null);
    setStep("daypicker");
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

  const loadDayCapacity = async () => {
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
      const targetIso = selectedDayData?.nextDate.iso || "";
      const total = fetched
        .filter(Boolean)
        .filter((o) => o.dayIso === targetIso)
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

      {step === "daypicker" && (
        <DayPickerScreen
          onSelectDay={(day) => {
            if (day === "devis") { setStep("devis"); return; }
            if (day === "batch") { setStep("batch"); return; }
            setSelectedDay(day); setCart({}); setExtras({}); setStep("menu");
          }}
          schedule={schedule}
          blockedDates={blockedDates}
          openDates={openDates}
          batchDate={batchDate}
          onOpenAdmin={() => setStep("pin")}
        />
      )}

      {step === "batch" && (
        <BatchScreen onBack={() => setStep("daypicker")} batchDate={batchDate} onConfirm={handleConfirmBatch} />
      )}

      {step === "devis" && (
        <DevisScreen onBack={() => setStep("daypicker")} />
      )}

      {step === "menu" && (
        <MenuScreen
          cart={cart}
          weeklyContent={weeklyContent}
          onAdd={handleAdd}
          onRemove={handleRemove}
          onGoCart={() => setStep("cart")}
          onOpenAdmin={() => setStep("pin")}
          onBack={() => setStep("daypicker")}
          orderWindow={orderWindow}
          selectedDay={selectedDay}
          selectedDayData={selectedDayData}
        />
      )}

      {step === "pin" && (
        <PinScreen onBack={() => setStep("daypicker")} onSuccess={() => setStep("admin")} />
      )}

      {step === "admin" && (
        <AdminScreen
          weeklyContent={weeklyContent}
          onBack={() => setStep("daypicker")}
          onSave={handleSaveWeeklyContent}
          onOpenOrders={handleOpenOrders}
          blockedDates={blockedDates}
          onSaveBlocked={handleSaveBlocked}
          schedule={schedule}
          onSaveSchedule={handleSaveSchedule}
          openDates={openDates}
          onSaveOpenDates={handleSaveOpenDates}
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
          extras={extras}
          onAddExtra={handleAddExtra}
          onRemoveExtra={handleRemoveExtra}
          onNext={() => { setStep("slot"); loadDayCapacity(); }}
        />
      )}

      {step === "slot" && (
        <SlotScreen
          onBack={() => setStep("cart")}
          selectedSlot={selectedSlot}
          onSelectSlot={setSelectedSlot}
          onConfirm={handleConfirmOrder}
          dayLabel={dayLabel}
          daySlots={daySlots}
          boxAlreadyBooked={boxAlreadyBooked}
          boxInCart={boxInCart}
          loadingCapacity={loadingCapacity}
          deliveryMode={deliveryMode}
          onToggleDelivery={(v) => { setDeliveryMode(v); setDeliveryError(""); }}
          addressForm={addressForm}
          onAddressFormChange={(f) => { setAddressForm(f); setDeliveryError(""); }}
          deliveryError={deliveryError}
          checkingDelivery={checkingDelivery}
          deliveryInfo={deliveryInfo}
        />
      )}

      {step === "confirm" && lastOrder && <ConfirmScreen order={lastOrder} onNewOrder={handleNewOrder} />}
    </div>
  );
}
```
