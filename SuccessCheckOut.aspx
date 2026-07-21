<%@ Page Language="C#" MasterPageFile="~/MasterPage.master" AutoEventWireup="true" CodeFile="SuccessCheckOut.aspx.cs" Inherits="SuccessCheckOut" %>

<%@ Register Assembly="AjaxControlToolkit" Namespace="AjaxControlToolkit" TagPrefix="asp" %>

<asp:Content ID="Content1" ContentPlaceHolderID="head" runat="Server">
</asp:Content>
<asp:Content ID="Content2" ContentPlaceHolderID="ContentPlaceHolder1" runat="Server">
    <asp:ToolkitScriptManager ID="sm" runat="server" />
    <asp:UpdatePanel runat="server">
        <ContentTemplate>
            <!-- Breadcrumb start -->
            <div class="hnm-breadcrumb">
                <div class="content-wrapper">
                    <div class="hnm-breadcrumb__wrapper">
                        <a href="Home.aspx" title="HOME" class="hnm-breadcrumb__item">HOME</a>
                        <a href="#" title="Login" class="hnm-breadcrumb__item active">Success</a>
                    </div>
                </div>
            </div>
            <!-- Breadcrumb end -->

            <!-- Login Sec Start -->
            <div class="hnm-login" style="background-image: url(../assets/images/login-bg.jpg);">
                <div class="content-wrapper">
                    <div class="hnm-login__wrapper">
                        <div class="hnm-login__box">
                            <h1 class="hnm-main-head">Payment Successfully Done</h1>
                            <div class="hnm-login__btn-sec">
                                <div class="hnm-login__btn-left">
                                    <div class="hnm-login__btn-wrapper">
                                        <a href="MyProfile.aspx" class="hnm-button">Go To My Profile</a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <!-- Login Sec End -->
        </ContentTemplate>
    </asp:UpdatePanel>
</asp:Content>

