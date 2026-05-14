"use client";

import { useEffect, useState } from "react";

type Inventory = {
  id: string;
  warehouseId: string;
  totalStock: number;
  reservedStock: number;
  warehouse: { name: string; location: string };
};

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  inventory: Inventory[];
};

export default function Dashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState({ text: "", type: "" });

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      setProducts(data);
    } catch (error) {
      console.error("Failed to fetch products", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleReserve = async (productId: string, warehouseId: string) => {
    setStatusMsg({ text: "Processing...", type: "info" });
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, warehouseId, quantity: 1 }),
      });
      
      const data = await res.json();

      if (res.ok) {
        setStatusMsg({ text: "Success! Item reserved for 15 mins.", type: "success" });
        fetchProducts();
      } else {
        setStatusMsg({ text: `Failed: ${data.error}`, type: "error" });
      }
    } catch (error) {
      setStatusMsg({ text: "Network error occurred.", type: "error" });
    }

    setTimeout(() => setStatusMsg({ text: "", type: "" }), 3000);
  };

  const handleCleanup = async () => {
    setStatusMsg({ text: "Running cleanup script...", type: "info" });
    try {
      const res = await fetch("/api/reservations/cleanup", { method: "POST" });
      const data = await res.json();
      setStatusMsg({ text: `Cleanup complete. Cleared: ${data.clearedCount}`, type: "success" });
      fetchProducts();
    } catch (error) {
      setStatusMsg({ text: "Failed to run cleanup.", type: "error" });
    }
    setTimeout(() => setStatusMsg({ text: "", type: "" }), 3000);
  };

  if (loading) return <div className="p-10 text-xl font-bold">Loading Inventory...</div>;

  return (
    <main className="min-h-screen bg-gray-50 p-8 text-gray-900">
      <div className="max-w-5xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Allo Inventory Manager</h1>
            <p className="text-gray-500 mt-1">Concurrency & Race-Condition Testing Dashboard</p>
          </div>
          <button 
            onClick={handleCleanup}
            className="bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition"
          >
            Run Expired Cleanup
          </button>
        </header>
        {statusMsg.text && (
          <div className={`mb-6 p-4 rounded-md font-medium text-white ${
            statusMsg.type === "error" ? "bg-red-500" : 
            statusMsg.type === "success" ? "bg-green-500" : "bg-blue-500"
          }`}>
            {statusMsg.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {products.map((product) => (
            <div key={product.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold">{product.name}</h2>
              <p className="text-gray-500 text-sm mb-4">{product.description}</p>
              <p className="text-lg font-semibold mb-4">₹{product.price}</p>
              
              <div className="space-y-4">
                {product.inventory?.map((inv) => {
                  const available = inv.totalStock - inv.reservedStock;
                  const isOutOfStock = available <= 0;

                  return (
                    <div key={inv.id} className="bg-gray-50 p-4 rounded-lg border border-gray-100 flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-sm">Warehouse ID: <span className="font-normal text-xs text-gray-500">{inv.warehouseId.substring(0,8)}...</span></p>
                        <div className="flex gap-4 mt-2 text-sm">
                          <span className="text-green-600 font-medium">Available: {available}</span>
                          <span className="text-orange-500 font-medium">Reserved: {inv.reservedStock}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleReserve(product.id, inv.warehouseId)}
                        disabled={isOutOfStock}
                        className={`px-4 py-2 rounded-md font-medium transition ${
                          isOutOfStock 
                            ? "bg-gray-200 text-gray-400 cursor-not-allowed" 
                            : "bg-blue-600 text-white hover:bg-blue-700"
                        }`}
                      >
                        {isOutOfStock ? "Out of Stock" : "Reserve 1"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}