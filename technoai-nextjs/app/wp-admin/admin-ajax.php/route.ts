import { deliver, MESSAGES, parseAtomicForm, parseProForm, rateLimited } from "../../../lib/form-submissions";

// Stand-in for WordPress's /wp-admin/admin-ajax.php, which the Elementor scripts on every page post to.
export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) => Response.json(body, { status });

export async function POST(req: Request) {
  // Only accept submissions coming from this site's own pages.
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (origin && host && new URL(origin).host !== host) return new Response("0", { status: 403 });

  let fd: FormData;
  try {
    fd = await req.formData();
  } catch {
    return new Response("0", { status: 400 });
  }
  const action = fd.get("action");
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "local";

  if (action === "elementor_pro_forms_send_form") {
    const fail = (message: string, errors: Record<string, string> = {}) =>
      json({ success: false, data: { message, errors, data: [] } });
    if (rateLimited(ip)) return fail(MESSAGES.error);
    const parsed = parseProForm(fd);
    if (!parsed.ok) return fail(MESSAGES.invalid, parsed.errors);
    if (!(await deliver(parsed.submission))) return fail(MESSAGES.error);
    return json({ success: true, data: { message: MESSAGES.success, data: [] } });
  }

  if (action === "elementor_pro_atomic_forms_send_form") {
    if (rateLimited(ip)) return json({ success: false, message: MESSAGES.error });
    const parsed = parseAtomicForm(fd);
    if (!parsed.ok) return json({ success: false, message: MESSAGES.invalid });
    if (!(await deliver(parsed.submission))) return json({ success: false, message: MESSAGES.error });
    return json({ success: true, message: MESSAGES.success });
  }

  // Any other WordPress AJAX action (WooCommerce fragments, click tracking, ...) has no backend here.
  return new Response("0", { status: 400 });
}
