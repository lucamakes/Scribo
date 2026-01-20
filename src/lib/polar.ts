import { Polar } from "@polar-sh/sdk";

export const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  // Use sandbox for testing (set POLAR_SANDBOX=true in .env.local)
  server: process.env.POLAR_SANDBOX === 'true' ? 'sandbox' : 'production',
});
