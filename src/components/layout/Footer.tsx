export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#120e18] text-[#a89b8c] py-6 mt-auto">
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-center">
        <span className="text-sm">
          <span className="text-[#f5a623] font-semibold">Kalameh</span> &copy; {year}
        </span>
      </div>
    </footer>
  );
}
