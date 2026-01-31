import CustomerModel from "../../customer/customer-model";

export interface CustomerNotificationInfo {
    customerEmail?: string;
    customerName?: string;
    customerPhone?: string;
}

// Helper to get customer info for notifications
export async function getCustomerNotificationInfo(
    customerId: string
): Promise<CustomerNotificationInfo> {
    try {
        const customer = await CustomerModel.findOne({ userId: customerId });

        if (!customer) {
            return {};
        }

        return {
            customerEmail: customer.email,
            customerName: `${customer.firstName} ${customer.lastName}`.trim(),
        };
    } catch (error) {
        console.error("Failed to fetch customer info for notification:", error);
        return {};
    }
}
