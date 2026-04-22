"use client";

import { Landmark, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { formatCurrency, toBankPathSegment } from "@/lib/utils";

interface OperationalCardsProps {
  boxes: any[];
}

export function OperationalCards({ boxes }: OperationalCardsProps) {
  const sortedAccounts = [...boxes].sort((a, b) => b.balance - a.balance);
  const totalBalance = sortedAccounts.reduce((acc, curr) => acc + curr.balance, 0);

  return (
    <Card className="shadow-xs">
      <CardHeader>
        <CardTitle>Balances por Cuenta</CardTitle>
        <CardDescription>Estado actual de cada cuenta bancaria activa</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedAccounts.map((account) => {
            const percentage = totalBalance > 0 ? (account.balance / totalBalance) * 100 : 0;
            const bankName = account.name.split(' - ')[0];
            const accountNumber = account.name.split(' - ')[1];
            
            return (
              <div key={account.name} className="flex flex-col gap-2 rounded-lg border p-4 shadow-sm transition-all hover:border-primary/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Landmark className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{bankName}</p>
                      <p className="text-muted-foreground text-[10px]">{accountNumber}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold tabular-nums">{formatCurrency(account.balance)}</p>
                    <p className="text-muted-foreground text-[10px] uppercase">{account.type}</p>
                  </div>
                </div>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground">Distribución</span>
                    <span className="font-medium">{percentage.toFixed(1)}%</span>
                  </div>
                  <Progress value={percentage} className="h-1.5" />
                </div>
                <div className="mt-2 text-right">
                  <Button asChild size="sm" variant="ghost" className="h-7 text-xs px-2">
                    <Link href={`/dashboard/banco/${toBankPathSegment(bankName)}`}>
                      Ver Banco <ArrowRight className="ml-1 size-3" />
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
