<%@ Page Title="" Language="C#" MasterPageFile="~/MasterPage.master" AutoEventWireup="true" CodeFile="UserRegisterOtp.aspx.cs" Inherits="UserRegisterOtp" %>

<%@ Register Assembly="AjaxControlToolkit" Namespace="AjaxControlToolkit" TagPrefix="asp" %>

<asp:Content ID="Content1" ContentPlaceHolderID="head" runat="Server">
    <script type="text/javascript">
        function openMessageModal() {
            $('#alertMessage').modal('show');
        }
    </script>
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
                        <a href="#" title="Login" class="hnm-breadcrumb__item active">Otp Verfication</a>
                    </div>
                </div>
            </div>
            <!-- Breadcrumb end -->

            <!-- Login Sec Start -->
            <div class="hnm-login" style="background-image: url(../assets/images/login-bg.jpg);">
                <div class="content-wrapper">
                    <div class="hnm-login__wrapper">
                        <div class="hnm-login__box">
                            <h1 class="hnm-main-head">One time password</h1>
                            <div class="hnm-input">
                                <p class="hnm-input__text-label">An OTP is sent to the email address provided. Please enter it to confirm registration.</p>
                                <asp:TextBox ID="txtOtp" runat="server" CssClass="hnm-input__text" placeholder="Otp"></asp:TextBox>
                                <asp:RequiredFieldValidator ID="reqOtp" runat="server" ControlToValidate="txtOtp" ValidationGroup="otp"
                                    class="error" Display="Dynamic" ErrorMessage="Enter otp number" ForeColor="Red" />
                            </div>
                            <div class="hnm-login__btn-sec">
                                <div class="hnm-login__btn-left">
                                    <div class="hnm-login__btn-wrapper">
                                        <asp:LinkButton ID="lnkSubmit" runat="server" CssClass="hnm-button" CausesValidation="true" ValidationGroup="otp" OnClick="lnkSubmit_Click">Submit</asp:LinkButton>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal fade hnm-modal hnm-modal__points" id="alertMessage" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog  modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Pay</h5>
                            <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div class="modal-body">
                            <p class="hnm-modal__desc">You entered an invalid or incorrect OTP number.</p>
                        </div>
                    </div>
                </div>
            </div>
            <!-- Login Sec End -->
        </ContentTemplate>
    </asp:UpdatePanel>
</asp:Content>

