<%@ Page Language="C#" AutoEventWireup="true" CodeFile="Admin.aspx.cs" Inherits="Admin" %>

<%@ Register Src="~/Controls/UserControls/ErrorDisplay.ascx" TagPrefix="PageControl" TagName="ErrorDisplay" %>
<%@ Register Assembly="AjaxControlToolkit" Namespace="AjaxControlToolkit" TagPrefix="asp" %>
<%@ Register TagPrefix="recaptcha" Namespace="Recaptcha" Assembly="Recaptcha" %>

<!DOCTYPE html>

<html xmlns="http://www.w3.org/1999/xhtml">
<head runat="server">
    <meta charset="utf-8" />
    <link href="Admin/images/hnm-logo.png" rel="shortcut icon" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="Home & Me" />
    <meta name="keywords" content="" />
    <meta name="author" content="LEFT4CODE" />
    <title>Login - HNM</title>
    <link rel="stylesheet" href="Admin/css/app.css" />
</head>
<body class="login">
    <form id="form1" runat="server">
        <div class="container sm:px-10">
            <div class="block xl:grid grid-cols-2 gap-4">
                <div class="hidden xl:flex flex-col min-h-screen">
                    <a href="" class="-intro-x flex items-center pt-5">
                        <img alt="Midone Tailwind HTML Admin Template" class="w-6" src="Admin/images/hnm-logo.png" style="width: 90px" />
                    </a>
                    <div class="my-auto">
                        <img alt="Midone Tailwind HTML Admin Template" class="-intro-x w-1/2 -mt-16" src="Admin/images/illustration.svg" />
                        <div class="-intro-x text-white font-medium text-4xl leading-tight mt-10">
                            A few more clicks to 
                            <br>
                            sign in to your account.
                        </div>
                        <div class="-intro-x mt-5 text-lg text-white">Manage your accounts in one place</div>
                    </div>
                </div>
                <div class="h-screen xl:h-auto flex py-5 xl:py-0 my-10 xl:my-0">
                    <div class="my-auto mx-auto xl:ml-20 bg-white xl:bg-transparent px-5 sm:px-8 py-8 xl:p-0 rounded-md shadow-md xl:shadow-none w-full sm:w-3/4 lg:w-2/4 xl:w-auto">
                        <h2 class="intro-x font-bold text-2xl xl:text-3xl text-center xl:text-left">Sign In
                        </h2>
                        <div class="intro-x mt-2 text-gray-500 xl:hidden text-center">A few more clicks to sign in to your account. Manage your accounts in one place</div>
                        <div class="intro-x mt-8">
                            <asp:TextBox ID="txtEmail" runat="server" CssClass="intro-x login__input input input--lg border border-gray-300 block" placeholder="Email"></asp:TextBox>
                            <asp:TextBox ID="txtPassword" runat="server" CssClass="intro-x login__input input input--lg border border-gray-300 block mt-4" placeholder="Password" TextMode="Password"></asp:TextBox>
                        </div>
                        <div class="intro-x flex text-gray-700 text-xs sm:text-sm mt-4">
                            <div class="flex items-center mr-auto">
                                <input type="checkbox" class="input border mr-2" id="remember-me">
                                <label class="cursor-pointer select-none" for="remember-me">Remember me</label>
                            </div>
                            <a href="">Forgot Password?</a>
                        </div>
                        <div class="intro-x mt-5 xl:mt-8 text-center xl:text-left">
                            <asp:Button ID="btnLogin" CssClass="button button--lg w-full xl:w-32 text-white bg-theme-1 xl:mr-3" runat="server" Text="Login" OnClick="btnLogin_Click" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <pagecontrol:errordisplay runat="server" id="ErrorDisplay" />
        <script src="Admin/js/app.js"></script>
    </form>
</body>
</html>

