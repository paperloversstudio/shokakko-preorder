export function Footer() {
  return (
    <footer className="border-t border-line bg-white px-4 py-6 text-center text-sm text-ink-soft">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-6 gap-y-2">
        <a
          href="https://www.shokakko.com.au/pages/contact-us"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold hover:text-ink hover:underline"
        >
          Contact Us
        </a>
        <a
          href="https://www.shokakko.com.au/pages/shipping-policy"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold hover:text-ink hover:underline"
        >
          Shipping Policy
        </a>
      </div>
    </footer>
  );
}
