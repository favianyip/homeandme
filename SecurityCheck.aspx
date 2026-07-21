<%@ Page Language="C#" AutoEventWireup="true" CodeFile="SecurityCheck.aspx.cs" Inherits="SecurityCheck" %>

<%@ Register Assembly="AjaxControlToolkit" Namespace="AjaxControlToolkit" TagPrefix="asp" %>
<%@ Register TagPrefix="recaptcha" Namespace="Recaptcha" Assembly="Recaptcha" %>


<head runat="server">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <title>Stratagile</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="shortcut icon" href="/Images/PPIM-Icon.ico" type="image/x-icon" />
    <link href="/AdminAsset/css/bootstrap.min.css" rel="stylesheet" />
    <link href="/font-awesome/css/font-awesome.css" rel="stylesheet" />
    <link href="/AdminAsset/css/animate.css" rel="stylesheet" />
    <link href="/AdminAsset/css/style.css" rel="stylesheet" />
    <script src="/AdminAsset/js/jquery-2.1.1.js" type="text/javascript"></script>
    <script src="/AdminAsset/js/bootstrap.min.js" type="text/javascript"></script>
    <script src='https://www.google.com/recaptcha/api.js'></script>
</head>
<body style="background-color: black">
    <form id="form1" runat="server">
        <asp:ToolkitScriptManager ID="ToolkitScriptManager1" runat="server" EnablePageMethods="true">
        </asp:ToolkitScriptManager>
        <asp:UpdatePanel ID="UpdatePanel" UpdateMode="Always" runat="server" class="absolute">
            <ContentTemplate>
                <div id="progress" runat="server" class="progress">
                    Please wait...<br />
                    <img alt="loading" src="assets/images/busy.gif" />
                </div>
                <section class="LogIn" style="background-color: black;">
                    <div class="LogInBox">
                        <div class="LogBoxCnt">
                            <img src="assets/images/hnm-logo.png" style="margin-top: -20px; width: 218px;" class="TopIcon">
                            <p>Before you proceed, please complete the captcha below.</p>
                            <br />
                            <br />
                            <div align="center" class="g-recaptcha" style="transform: scale(0.85); -webkit-transform: scale(0.85); transform-origin: 0 0; -webkit-transform-origin: 0 0;" data-theme="light" data-sitekey="6LdA46YgAAAAAGYK0v9N5CsbbdGGPaX5zRK36-sQ"></div>
                            <br />
                            <br />
                            <asp:Button ID="btnProceed" runat="server" Text="Proceed »" Width="150px" CssClass="btn btn-light" OnClick="btnProceed_Click" />
                            <asp:Label ID="lblMessage" runat="server" Text="" CssClass="label label-danger"></asp:Label>
                        </div>
                        <p class="BtmTxt">
                            © 2022 StratAgile Pte Ltd.  All rights reserved<br />
                            <a href="http://www.stratagile.com/en/page/Contact/" target="_blank">Contact us</a>
                        </p>
                    </div>
                </section>
            </ContentTemplate>
        </asp:UpdatePanel>
        <%--<asp:UpdatePanelAnimationExtender ID="UpdatePanel_UpdatePanelAnimationExtender" runat="server"
            Enabled="True" TargetControlID="UpdatePanel">
            <animations>
                <onupdating>
                    <styleaction animationtarget="progress" attribute="visibility" value="visible" />
                </onupdating>
                <onupdated>
                    <styleaction animationtarget="progress" attribute="visibility" value="hidden" />
                </onupdated>
            </animations>
        </asp:UpdatePanelAnimationExtender>--%>
    </form>
</body>
