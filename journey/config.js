/* Home & Me journey: one switch.
 * true  = the live site: the floor plan step checks what was filled in, Send really sends the
 *         enquiry to the Home & Me enquiry service, and the customer lands on "request received".
 * false = the click-through preview: nothing is checked, nothing is sent, and the later
 *         screens (designing, your design, extras) can be walked with sample content.
 */
window.HNM_LIVE = true;
/* Floor plan upload. false = closed: the upload box leaves the page and the request goes without a plan (owner,
   20 Nov 2026; kept closed in the 25 Nov release until the owner's word). true = open: the customer sends the PDF
   floor plan with the request. 'testers' = open only for a visit from a tester link. The enquiry service has its
   own switch, which acts in seconds; this file needs a site release. */
window.HNM_PLAN_UPLOAD = false;
/* The customer's progress and approved design: read-only pages on the Home & Me enquiry service, filled from the
   design side after a person approves each design (the Designing and Your design pages). */
window.HNM_PAGES = 'https://spark-792d.tail223b04.ts.net/hnm/p/';
