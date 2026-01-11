export const Roles = {
    ADMIN: "admin",
    MANAGER: "manager",
    CUSTOMER: "customer",
} as const;

export type Role = (typeof Roles)[keyof typeof Roles];
