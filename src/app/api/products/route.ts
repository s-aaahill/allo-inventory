import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET () {
    try {
        const products = await prisma.product.findMany({
            include: {
                inventory: {
                    include: {
                        warehouse: true,
                    },
                },
            },
        });

        const formattedProducts = products.map((product) => ({
            id: product.id,
            name: product.name,
            description: product.description,
            price: product.price,
            stockByWarehouse: product.inventory.map((inv) => ({
                inventoryId: inv.id,
                warehouseId: inv.warehouse.id,
                warehouseName: inv.warehouse.name,
                totalStock: inv.totalStock,
                reservedStock: inv.reservedStock,
                availableStock: inv.totalStock - inv.reservedStock,
            })),
         }));

         return NextResponse.json(formattedProducts);
    } catch(error) {
        console.error('Error fetching products:', error);

        return NextResponse.json(
            { error: 'Failed to fetch products' },
            { status: 500 }
        );
    }
}