using Stripe;
using Stripe.Checkout;
using System;
using System.Collections;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;

public partial class SuccessCheckOutStripe : System.Web.UI.Page
{
    protected void Page_Load(object sender, EventArgs e)
    {
        //string session_id = Request.QueryString["id"];

        //var sessionService = new SessionService();
        //Session session = sessionService.Get(session_id);


        //string paymentStatus = session.PaymentStatus;
        //string PaymentIntentId = session.PaymentIntentId;
    }
}