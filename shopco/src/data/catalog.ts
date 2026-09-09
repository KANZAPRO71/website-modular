import { Product } from "@/types/product.types";
import { Review } from "@/types/review.types";

export const newArrivalsData: Product[] = [
  {
    id: 1,
    title: "Kaos Detail Tape",
    srcUrl: "/images/pic1.png",
    gallery: ["/images/pic1.png", "/images/pic10.png", "/images/pic11.png"],
    price: 120000,
    discount: { amount: 0, percentage: 0 },
    rating: 4.5,
  },
  {
    id: 2,
    title: "Jeans Skinny Fit",
    srcUrl: "/images/pic2.png",
    gallery: ["/images/pic2.png"],
    price: 260000,
    discount: { amount: 0, percentage: 20 },
    rating: 3.5,
  },
  {
    id: 3,
    title: "Kemeja Kotak Kotak",
    srcUrl: "/images/pic3.png",
    gallery: ["/images/pic3.png"],
    price: 180000,
    discount: { amount: 0, percentage: 0 },
    rating: 4.5,
  },
  {
    id: 4,
    title: "Kaos Stripe Lengan",
    srcUrl: "/images/pic4.png",
    gallery: ["/images/pic4.png", "/images/pic10.png", "/images/pic11.png"],
    price: 160000,
    discount: { amount: 0, percentage: 30 },
    rating: 4.5,
  },
];

export const topSellingData: Product[] = [
  {
    id: 5,
    title: "Kemeja Flanel Garis",
    srcUrl: "/images/pic5.png",
    gallery: ["/images/pic5.png", "/images/pic10.png", "/images/pic11.png"],
    price: 232000,
    discount: { amount: 0, percentage: 20 },
    rating: 5.0,
  },
  {
    id: 6,
    title: "Kaos Graphic Courage",
    srcUrl: "/images/pic6.png",
    gallery: ["/images/pic6.png", "/images/pic10.png", "/images/pic11.png"],
    price: 145000,
    discount: { amount: 0, percentage: 0 },
    rating: 4.0,
  },
  {
    id: 7,
    title: "Celana Pendek Bermuda",
    srcUrl: "/images/pic7.png",
    gallery: ["/images/pic7.png"],
    price: 80000,
    discount: { amount: 0, percentage: 0 },
    rating: 3.0,
  },
  {
    id: 8,
    title: "Jeans Hitam Faded",
    srcUrl: "/images/pic8.png",
    gallery: ["/images/pic8.png"],
    price: 210000,
    discount: { amount: 0, percentage: 0 },
    rating: 4.5,
  },
];

export const relatedProductData: Product[] = [
  {
    id: 12,
    title: "Polo Contrast Trim",
    srcUrl: "/images/pic12.png",
    gallery: ["/images/pic12.png", "/images/pic10.png", "/images/pic11.png"],
    price: 242000,
    discount: { amount: 0, percentage: 20 },
    rating: 4.0,
  },
  {
    id: 13,
    title: "Kaos Gradient Graphic",
    srcUrl: "/images/pic13.png",
    gallery: ["/images/pic13.png", "/images/pic10.png", "/images/pic11.png"],
    price: 145000,
    discount: { amount: 0, percentage: 0 },
    rating: 3.5,
  },
  {
    id: 14,
    title: "Polo Tipping Detail",
    srcUrl: "/images/pic14.png",
    gallery: ["/images/pic14.png"],
    price: 180000,
    discount: { amount: 0, percentage: 0 },
    rating: 4.5,
  },
  {
    id: 15,
    title: "Kaos Hitam Stripe",
    srcUrl: "/images/pic15.png",
    gallery: ["/images/pic15.png"],
    price: 150000,
    discount: { amount: 0, percentage: 30 },
    rating: 5.0,
  },
];

export const catalogProducts: Product[] = [
  ...newArrivalsData,
  ...topSellingData,
  ...relatedProductData,
];

export const reviewsData: Review[] = [
  {
    id: 1,
    user: "Alya K.",
    content:
      '"Dulu susah cari baju yang pas gaya, tapi di sini koleksinya lengkap banget. Cocok buat daily sampai acara santai."',
    rating: 5,
    date: "14 Agustus 2023",
  },
  {
    id: 2,
    user: "Sarah M.",
    content:
      '"Kualitas bahannya enak dipakai dan potongannya rapi. Dari kaos sampai kemeja, semuanya oke banget."',
    rating: 5,
    date: "15 Agustus 2023",
  },
  {
    id: 3,
    user: "Rizky H.",
    content:
      '"Kaosnya simple tapi keliatan premium. Cutting-nya pas di badan, jadi sering jadi andalan buat keluar."',
    rating: 5,
    date: "16 Agustus 2023",
  },
  {
    id: 4,
    user: "Olivia P.",
    content:
      '"Suka banget sama desainnya — minimalis tapi tetap standout. Nyaman dipakai seharian."',
    rating: 5,
    date: "17 Agustus 2023",
  },
  {
    id: 5,
    user: "Liam K.",
    content:
      '"Bahan lembut, jahitan rapi, dan modelnya kekinian. Worth it buat repeat order."',
    rating: 5,
    date: "18 Agustus 2023",
  },
  {
    id: 6,
    user: "Dina S.",
    content:
      '"Kaos favorit aku sekarang! Desain unik, bahan adem, cocok buat cuaca Jakarta."',
    rating: 5,
    date: "19 Agustus 2023",
  },
];
