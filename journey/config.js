/* Home & Me journey: one switch.
 * true  = the live site: the floor plan step checks what was filled in, Send really sends the
 *         enquiry to the Home & Me enquiry service, and the customer lands on "request received".
 * false = the click-through preview: nothing is checked, nothing is sent, and the later
 *         screens (designing, your design, extras) can be walked with sample content.
 */
window.HNM_LIVE = true;
/* Floor plan upload. false = closed until the design engine is ready (owner, 20 Nov 2026).
   Set it to true to open the upload step again. */
window.HNM_PLAN_UPLOAD = false;
