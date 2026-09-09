import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type FaqItem = {
  question: string;
  answer: string;
};

const faqsData: FaqItem[] = [
  {
    question: "Bahan produk ini apa?",
    answer:
      "Kebanyakan produk DEVI menggunakan katun premium atau campuran katun-polyester yang adem dan nyaman dipakai sehari-hari.",
  },
  {
    question: "Gimana cara merawat pakaiannya?",
    answer:
      "Cuci dengan mesin suhu hangat, jangan bleach. Keringkan di tempat teduh atau mesin pengering suhu rendah agar warna tetap awet.",
  },
  {
    question: "Ukuran di website sudah sesuai?",
    answer:
      "Ya, kami pakai standar ukuran lokal. Kalau ragu, tanya langsung lewat fitur suara — tim DEVI siap bantu pilih ukuran yang pas.",
  },
  {
    question: "Produk ini unisex atau khusus pria/wanita?",
    answer:
      "Tergantung model. Beberapa item unisex, beberapa khusus pria atau wanita — detail ada di halaman produk masing-masing.",
  },
  {
    question: "Berapa lama pengiriman?",
    answer:
      "Area Jabodetabek 1–2 hari kerja, luar kota 3–5 hari kerja. Gratis ongkir untuk pesanan di atas Rp 300.000.",
  },
  {
    question: "Bisa retur kalau ukuran tidak pas?",
    answer:
      "Bisa, dalam 7 hari sejak barang diterima. Produk harus belum dipakai dan masih ada label asli.",
  },
];

const FaqContent = () => {
  return (
    <section>
      <h3 className="text-xl sm:text-2xl font-bold text-black mb-5 sm:mb-6">
        Pertanyaan yang sering ditanyakan
      </h3>
      <Accordion type="single" collapsible>
        {faqsData.map((faq, idx) => (
          <AccordionItem key={idx} value={`item-${idx + 1}`}>
            <AccordionTrigger className="text-left">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent>{faq.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
};

export default FaqContent;
