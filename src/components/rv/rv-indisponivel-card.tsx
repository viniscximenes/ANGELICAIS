"use client";

import {
  IconAlertCircle,
  IconBan,
  IconBeach,
  IconStethoscope,
} from "@tabler/icons-react";
import { motion } from "framer-motion";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

interface Props {
  status: string;
  mensagem: string;
}

function getIcon(status: string) {
  const s = status
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

  if (s.includes("feria")) return IconBeach;
  if (s.includes("licen")) return IconStethoscope;
  if (s.includes("deslig")) return IconBan;
  return IconAlertCircle;
}

export function RvIndisponivelCard({ status, mensagem }: Props) {
  const Icon = getIcon(status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.25, ease: EASE_OUT_EXPO }}
      className="elevation-1 rounded-xl p-16 text-center"
      role="status"
    >
      <Icon
        size={48}
        className="text-muted-foreground mx-auto mb-4"
        aria-hidden="true"
      />
      <h2 className="ds-h2 mb-3">RV INDISPONÍVEL</h2>
      <p className="ds-body text-muted-foreground mx-auto max-w-md">
        {mensagem}
      </p>
    </motion.div>
  );
}
