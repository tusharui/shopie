type Product = {
  productname: string;
  productbrand: string;
  gender: string;
  price: number;
  primarycolor: string;
  description: string;
};

export default function ProductCard({ product }: { product: Product }) {
  return (
    <div className="border border-[#333] rounded-2xl p-5 mb-4 bg-[rgba(255,255,255,0.03)] backdrop-blur-md shadow-[0_4px_12px_rgba(0,0,0,0.3)] transition-all duration-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:scale-[1.01] hover:bg-[rgba(255,255,255,0.07)]">
      <h3 className="text-lg font-bold text-[#e0e0e0] mb-2">{product.productname}</h3>

      <p className="text-sm text-[#b0bec5] mb-1">
        <span className="font-semibold">Brand:</span> {product.productbrand} &nbsp;|&nbsp; <span className="font-semibold">Gender:</span> {product.gender}
      </p>

      <p className="text-sm text-[#b0bec5] mb-1">
        <span className="font-semibold">Price:</span> ₹{product.price} &nbsp;|&nbsp; <span className="font-semibold">Color:</span> {product.primarycolor}
      </p>

      <p className="text-xs text-[#cfd8dc] mt-2 leading-relaxed">{product.description}</p>
    </div>
  );
}
