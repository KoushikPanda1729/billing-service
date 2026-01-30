connect the strip to local host

stripe listen --forward-to localhost:5503/payments/webhook

Done. Here's the full summary of all events now being produced to the order topic:  
 ┌────────────────────┬─────────────────────────┬─────────────────────────────────────────────────────────────┐  
 │ Source │ Event │ When │  
 ├────────────────────┼─────────────────────────┼─────────────────────────────────────────────────────────────┤  
 │ Order Controller │ order-created │ New order created │  
 ├────────────────────┼─────────────────────────┼─────────────────────────────────────────────────────────────┤  
 │ Order Controller │ order-status-updated │ Status changed (confirmed, preparing, delivered, cancelled) │  
 ├────────────────────┼─────────────────────────┼─────────────────────────────────────────────────────────────┤  
 │ Order Controller │ order-deleted │ Order deleted │  
 ├────────────────────┼─────────────────────────┼─────────────────────────────────────────────────────────────┤  
 │ Payment Controller │ order-payment-completed │ Frontend verify call succeeds │  
 ├────────────────────┼─────────────────────────┼─────────────────────────────────────────────────────────────┤  
 │ Payment Controller │ order-payment-refunded │ Refund initiated │  
 ├────────────────────┼─────────────────────────┼─────────────────────────────────────────────────────────────┤  
 │ Webhook Controller │ order-payment-completed │ Stripe webhook confirms payment (primary/reliable path) │  
 ├────────────────────┼─────────────────────────┼─────────────────────────────────────────────────────────────┤  
 │ Webhook Controller │ order-payment-failed │ Stripe session expired or payment failed │  
 └────────────────────┴─────────────────────────┴─────────────────────────────────────────────────────────────┘

projection means : what field we want from backend we can get those

https://www.mongodb.com/docs/manual/reference/operator/query/projection/fields=name,email,age
