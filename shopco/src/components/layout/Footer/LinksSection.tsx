import React from "react";
import { FooterLinks } from "./footer.types";
import Link from "next/link";
import { cn } from "@/lib/utils";

const footerLinksData: FooterLinks[] = [
  {
    id: 1,
    title: "Perusahaan",
    children: [
      {
        id: 11,
        label: "Tentang kami",
        url: "#",
      },
      {
        id: 12,
        label: "Fitur",
        url: "#",
      },
      {
        id: 13,
        label: "Karya",
        url: "#",
      },
      {
        id: 14,
        label: "Karier",
        url: "#",
      },
    ],
  },
  {
    id: 2,
    title: "Bantuan",
    children: [
      {
        id: 21,
        label: "Layanan pelanggan",
        url: "#",
      },
      {
        id: 22,
        label: "Info pengiriman",
        url: "#",
      },
      {
        id: 23,
        label: "Syarat & ketentuan",
        url: "#",
      },
      {
        id: 24,
        label: "Kebijakan privasi",
        url: "#",
      },
    ],
  },
  {
    id: 3,
    title: "FAQ",
    children: [
      {
        id: 31,
        label: "Akun",
        url: "#",
      },
      {
        id: 32,
        label: "Kelola pengiriman",
        url: "#",
      },
      {
        id: 33,
        label: "Pesanan",
        url: "#",
      },
      {
        id: 34,
        label: "Pembayaran",
        url: "#",
      },
    ],
  },
  {
    id: 4,
    title: "Info",
    children: [
      {
        id: 41,
        label: "Panduan belanja",
        url: "#",
      },
      {
        id: 42,
        label: "Tips gaya",
        url: "#",
      },
      {
        id: 43,
        label: "Blog DEVI",
        url: "#",
      },
      {
        id: 44,
        label: "Instagram",
        url: "#",
      },
    ],
  },
];

const LinksSection = () => {
  return (
    <>
      {footerLinksData.map((item) => (
        <section className="flex flex-col mt-5" key={item.id}>
          <h3 className="font-medium text-sm md:text-base uppercase tracking-widest mb-6">
            {item.title}
          </h3>
          {item.children.map((link) => (
            <Link
              href={link.url}
              key={link.id}
              className={cn([
                link.id !== 41 && link.id !== 43 && "capitalize",
                "text-black/60 text-sm md:text-base mb-4 w-fit",
              ])}
            >
              {link.label}
            </Link>
          ))}
        </section>
      ))}
    </>
  );
};

export default LinksSection;
