import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { NEXT_ACTION_NOT_FOUND_HEADER } from "next/dist/client/components/app-router-headers";

export async function POST () {
    try {
        const now = new Date();
        const expiredReservations = await prisma.reservation.findMany({
            where: {
                status: "PENDING",
                expiresAt: { lt: now }
            }
        });

        if (expiredReservations.length === 0) {
            return NextResponse.json({
                message: "No expired reservations to cleanup",
                clearedCount: 0
            }, { status: 200 });
        }

        const clearedCount = await prisma.$transaction(async (tx) => {
            let count = 0;

            for (const res of expiredReservations) {
                await tx.reservation.update({
                    where: { id: res.id },
                    data: { status: "RELEASED" }
                });

                await tx.inventory.update({
                    where: { id: res.inventoryId },
                    data: {
                        reservedStock: { decrement: res.quantity }
                    }
                });

                count++;
            }

            return count;
        });

        return NextResponse.json({
            message: "Cleanup Successful",
            clearedCount
        }, { status: 200 });
    } catch (error) {
        console.error("Cleanup Error:", error);
        return NextResponse.json({ error: "Failed to cleanup" }, { status: 500 });
    }
}