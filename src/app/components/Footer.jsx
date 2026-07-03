"use client";

import {
  FaCcVisa,
  FaCcMastercard,
  FaCcAmex,
  FaCcDiscover,
  FaCcDinersClub,
  FaCcPaypal,
  FaCcApplePay,
  FaCcAmazonPay,
  FaCcJcb,
  FaCcStripe,
  FaGooglePay,
} from "react-icons/fa6";

const QUICK_LINKS = [
  "Home",
  "Shop",
  "PRE-WORKOUT Supplements",
  "Products",
  "Members",
  "Contact",
  "Wholesale",
  "Our Distributor",
];

// Payment methods shown in the "Connectivity" column, rendered as brand icons.
const PAYMENTS = [
  { label: "Amazon Pay", Icon: FaCcAmazonPay },
  { label: "American Express", Icon: FaCcAmex },
  { label: "Apple Pay", Icon: FaCcApplePay },
  { label: "Diners Club", Icon: FaCcDinersClub },
  { label: "Discover", Icon: FaCcDiscover },
  { label: "Google Pay", Icon: FaGooglePay },
  { label: "JCB", Icon: FaCcJcb },
  { label: "Mastercard", Icon: FaCcMastercard },
  { label: "PayPal", Icon: FaCcPaypal },
  { label: "Stripe", Icon: FaCcStripe },
  { label: "Visa", Icon: FaCcVisa },
];

const SUPPORT_LINKS = ["Privacy Policy", "Term & Conditions"];

const POLICY_LINKS = [
  "Privacy policy",
  "Refund policy",
  "Contact information",
  "Cancellation policy",
  "Terms of service",
  "Shipping policy",
];

export default function Footer() {
  return (
    <footer className="relative w-full text-white z-10 bg-[#1f1f1f] pt-20 md:pt-24 pb-8 px-6 md:px-12 lg:px-16">
      <div className="mx-auto max-w-[1320px] grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-16">
        {/* Column 1 — Quick Links */}
        <div>
          <h4 className="font-black uppercase tracking-[0.04em] text-2xl mb-7">
            Quick Links
          </h4>
          <ul className="flex flex-col gap-4">
            {QUICK_LINKS.map((label) => (
              <li key={label}>
                <a
                  href="#"
                  className="text-white/85 hover:text-white transition-colors text-[15px]"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Column 2 — Connectivity (payment methods) */}
        <div>
          <h4 className="font-black uppercase tracking-[0.04em] text-2xl mb-7">
            Connectivity
          </h4>
          <div className="flex flex-wrap gap-2.5 max-w-[420px]">
            {PAYMENTS.map(({ label, Icon }) => (
              <span
                key={label}
                role="img"
                aria-label={label}
                title={label}
                className="inline-flex items-center justify-center w-12 h-8 rounded-md bg-white text-[#1a1a1a]"
                style={{ boxShadow: "0 2px 6px rgba(0,0,0,0.25)" }}
              >
                <Icon className="w-7 h-7" />
              </span>
            ))}
          </div>
        </div>

        {/* Column 3 — Support */}
        <div>
          <h4 className="font-black uppercase tracking-[0.04em] text-2xl mb-7">
            Support
          </h4>
          <a
            href="tel:+18006748302"
            className="inline-block underline underline-offset-4 text-white/90 hover:text-white transition-colors text-[15px]"
          >
            (800) 674-8302
          </a>
          <ul className="mt-6 flex flex-col gap-3">
            {SUPPORT_LINKS.map((label) => (
              <li key={label}>
                <a
                  href="#"
                  className="underline underline-offset-4 text-white/85 hover:text-white transition-colors text-[15px]"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="mx-auto max-w-[1320px] mt-16 md:mt-20 pt-7 border-t border-white/10 flex flex-col lg:flex-row items-center justify-between gap-4">
        <p className="text-white/55 text-xs tracking-wide text-center lg:text-left">
          {new Date().getFullYear()} Shilajit Energy Drinks. All rights reserved
          &nbsp;|&nbsp; Powered by Shopify
        </p>
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {POLICY_LINKS.map((label) => (
            <a
              key={label}
              href="#"
              className="text-white/70 hover:text-white transition-colors text-[13px] whitespace-nowrap"
            >
              {label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
