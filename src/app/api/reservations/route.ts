import { NextResponse } from "next/server";
import { prisma } from '@/lib/prisma';

export async function POST (request: Request) {
    try {
        const body = await request.json();
        const { productId, warehouseId, quantity } = body;

        if (!productId || !warehouseId || !quantity || quantity <= 0) {
            return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
        }

        const reservation = await prisma.$transaction(async (tx) => {
            const inventory = await tx.inventory.findUnique({
                where: {
                    productId_warehouseId: { productId, warehouseId }
                }
            });

            if (!inventory) {
                throw new Error('Inventory record not found');
            }

            const availableStock = inventory.totalStock - inventory.reservedStock;

            if (availableStock < quantity) {
                throw new Error('Insufficient stock');
            }

            await tx.inventory.update({
                where: { id: inventory.id },
                data: {
                    reservedStock: { increment: quantity }
                }
            });

            const expiresAt = new Date();
            expiresAt.setMinutes(expiresAt.getMinutes() + 15);

            const newReservation = await tx.reservation.create({
                data: {
                    inventoryId: inventory.id,
                    quantity,
                    expiresAt,
                    status: "PENDING"
                }
            });

            return newReservation;        
        },{
            maxWait: 5000,
            timeout: 10000,
            isolationLevel: 'Serializable',
        });

        return NextResponse.json({ success: true, reservation }, { status: 201 });

    } catch (error: any) {
        if (error.message === 'Insufficient stock' || error.message === 'Inventory record not found') {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        console.error('Reservation Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}