<%@ Page Language="C#" AutoEventWireup="true" CodeFile="ReviewCheckOut.aspx.cs" Inherits="ReviewCheckOut" %>

<!DOCTYPE html>

<html xmlns="http://www.w3.org/1999/xhtml">
<head runat="server">
    <title></title>
    <script src="https://js.stripe.com/v3/"></script>
    <script>
        //var stripe = Stripe('pk_test_51KlWhcSCaeHy33qNYoOgY4KDyMaFXfAhg6ihwdFgwbjnsekbhwf2iujaKc0XQHwJpoWAsbPRWATIPzOLmR00s3rX00sz0BrJhU');
        var stripe = Stripe('pk_live_51KURcjD3Dy6ML5lWYFDk8ay8jPjLH2O2fq1pSqLd7wSP7dwzROFDoogqPsNFTlq4X9vM1AZRonJ1wb6lMaVg3KH700N0IofWe4');
        window.onload = function () {
            stripe.redirectToCheckout({
                sessionId: "<%= sessionId %>"
            });
        }
    </script>
</head>
<body>
    <form id="form1" runat="server">
        <div>
        </div>
    </form>
</body>
</html>
