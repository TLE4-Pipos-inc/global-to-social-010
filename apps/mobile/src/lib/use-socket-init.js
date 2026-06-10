import { useEffect } from "react";
import { useAccountQuery } from "@/features/auth";
import { createSocket, disconnectSocket } from "@/lib/socket";

export function useSocketInit() {
  const { data: accountData } = useAccountQuery();

  useEffect(() => {
    if (!accountData) return;

    createSocket(accountData);

    return () => {
      disconnectSocket();
    };
  }, [accountData]);
}