# Provider Zocdoc links

In **Admin → Providers → Add/Edit Provider**, use **Zocdoc link (optional)** below the existing booking link.

- A saved HTTPS Zocdoc link displays **Book on Zocdoc** on that provider's public profile.
- Clearing the field and saving removes the button entirely. There is no “Coming Soon” placeholder or fallback link.
- The normal **Book Appointment** link remains separate.
- Full admins and sub-admins with Providers Create/Edit can change the field. View-only admins cannot.

Apply migration `20260914223000_provider_zocdoc_url` before deploying the code. It adds the nullable field and transfers the existing hardcoded links to matching provider records. New seed records retain the original mappings; rerunning the general seed does not replace edited or intentionally cleared Zocdoc links. Older API clients that omit the field also leave saved links intact.
