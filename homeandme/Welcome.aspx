<%@ Page Language="C#" AutoEventWireup="true" CodeFile="Welcome.aspx.cs" Inherits="Welcome" enableEventValidation="false" %>

<%@ Register Assembly="DevExpress.Web.v19.2, Version=19.2.5.0, Culture=neutral, PublicKeyToken=b88d1754d700e49a" Namespace="DevExpress.Web" TagPrefix="dx" %>
<%@ Register Assembly="AjaxControlToolkit" Namespace="AjaxControlToolkit" TagPrefix="asp" %>
<%@ Register Src="~/Controls/Usercontrols/ErrorDisplay.ascx" TagPrefix="uc1" TagName="ErrorDisplay" %>

<head runat="server">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <title>Stratagile</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
     <link rel="shortcut icon" href="/Images/PPIM-Icon.ico" type="image/x-icon"/>
    <link href="/AdminAsset/css/bootstrap.min.css" rel="stylesheet" />
    <link href="/AdminAsset/css/animate.css" rel="stylesheet" />
    <link href="/AdminAsset/css/style.css" rel="stylesheet" />
    <script src="/AdminAsset/js/jquery-2.1.1.js" type="text/javascript"></script>
    <script src="/AdminAsset/js/bootstrap.min.js" type="text/javascript"></script>
</head>
<body>
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
                            <img src="assets/images/hnm-logo.png" style="margin-top:-20px; width: 218px;" class="TopIcon">
                            <p>This is the admin site. Login to proceed</p>
                            <asp:TextBox ID="txtUser" runat="server" placeholder="Username" MaxLength="50" />
                            <asp:TextBox ID="txtPassword" runat="server" TextMode="Password" placeholder="Password" MaxLength="50" />
                            <asp:Button ID="btnLogin" runat="server" Text="LOGIN" OnClick="btnLogin_Click" AutoPostBack="true"></asp:Button>
                        </div>
                        <p class="BtmTxt">
                            © 2022 StratAgile Pte Ltd.  All rights reserved<br />
                            <a href="http://www.stratagile.com/en/page/Contact/"  target="_blank">Contact us</a>
                        </p>
                    </div>
                </section>
                </form>
                </div>
                </div>
                <uc1:ErrorDisplay runat="server" ID="ErrorDisplay" ControlType="lock" />
            </ContentTemplate>
        </asp:UpdatePanel>
        <asp:UpdatePanelAnimationExtender ID="UpdatePanel_UpdatePanelAnimationExtender" runat="server"
            Enabled="True" TargetControlID="UpdatePanel">
            <Animations>
                <OnUpdating>
                    <StyleAction animationtarget="progress" Attribute="visibility" value="visible" />
                </OnUpdating>
                <OnUpdated>
                    <StyleAction animationtarget="progress" Attribute="visibility" value="hidden" />
                </OnUpdated>
            </Animations>
        </asp:UpdatePanelAnimationExtender>
    </form>
</body>
