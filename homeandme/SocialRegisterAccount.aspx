<%@ Page Title="" Language="C#" MasterPageFile="~/MasterPage.master" AutoEventWireup="true" CodeFile="SocialRegisterAccount.aspx.cs" Inherits="SocialRegisterAccount" %>

<%@ Register Assembly="AjaxControlToolkit" Namespace="AjaxControlToolkit" TagPrefix="asp" %>
<%@ Register Src="~/Controls/Usercontrols/ErrorDisplay.ascx" TagPrefix="uc1" TagName="ErrorDisplay" %>
<%@ Register Assembly="DevExpress.Web.v19.2, Version=19.2.5.0, Culture=neutral, PublicKeyToken=b88d1754d700e49a" Namespace="DevExpress.Web" TagPrefix="dx" %>

<asp:Content ID="Content1" ContentPlaceHolderID="head" runat="Server">
    <script type="text/javascript">
        function popMsg(s, e) {
            var mainDiv = document.getElementById(s.name + '_PW-1');
            mainDiv.style.width = '500px';
            s.SetWidth(mainDiv.clientWidth);
            s.UpdatePosition();
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
                        <a href="#" title="Login" class="hnm-breadcrumb__item active">Facebook Account Sign Up With Email</a>
                    </div>
                </div>
            </div>
            <!-- Breadcrumb end -->

            <!-- Login Sec Start -->
            <div class="hnm-login hnm-login--sign-up" style="background-image: url(../assets/images/login-bg.jpg);">
                <div class="content-wrapper">
                    <div class="hnm-login__wrapper">
                        <div class="hnm-login__box">
                            <h1 class="hnm-main-head">Private Facebook Account ! Sign Up With Email</h1>
                            <div class="hnm-input">
                                <p class="hnm-input__text-label">Name*</p>
                                <asp:TextBox ID="txtName" runat="server" CssClass="hnm-input__text"></asp:TextBox>
                                <asp:RequiredFieldValidator ID="reqName" runat="server" Display="Dynamic" ControlToValidate="txtName"
                                    ForeColor="Red" SetFocusOnError="true" ErrorMessage="Please enter the name" ValidationGroup="SignUp"></asp:RequiredFieldValidator>
                            </div>
                            <div class="hnm-input">
                                <p class="hnm-input__text-label">Contact*</p>
                                <asp:TextBox ID="txtContact" runat="server" CssClass="hnm-input__text"></asp:TextBox>
                                <asp:FilteredTextBoxExtender ID="fteContact" runat="server" TargetControlID="txtContact" ValidChars="+-0123456789"></asp:FilteredTextBoxExtender>
                                <asp:RequiredFieldValidator ID="reqContactNumber" runat="server" Display="Dynamic" ControlToValidate="txtContact"
                                    ForeColor="Red" SetFocusOnError="true" ErrorMessage="Please enter your phone number" ValidationGroup="SignUp"></asp:RequiredFieldValidator>
                            </div>
                            <div class="hnm-input">
                                <p class="hnm-input__text-label">Email address*</p>
                                <asp:TextBox ID="txtEmailAddress" runat="server" CssClass="hnm-input__text"></asp:TextBox>
                                <asp:RequiredFieldValidator ID="reqEmail" runat="server" Display="Dynamic" ControlToValidate="txtEmailAddress"
                                    ForeColor="Red" SetFocusOnError="true" ErrorMessage="Please enter the email address." ValidationGroup="SignUp"></asp:RequiredFieldValidator>
                                <asp:RegularExpressionValidator ID="revemail" runat="server" ControlToValidate="txtEmailAddress" ValidationGroup="SignUp"
                                    class="hnm-input__error" ValidationExpression="^([\w-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([\w-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?)$"
                                    Display="Dynamic" ErrorMessage="Please enter a valid email address" ForeColor="Red" />
                            </div>
                            <div class="hnm-input">
                                <p class="hnm-input__text-label">Password*</p>
                                <asp:TextBox ID="txtPassword" runat="server" CssClass="hnm-input__text" TextMode="Password"></asp:TextBox>
                                <asp:RequiredFieldValidator ID="reqPassword" runat="server" Display="Dynamic" ControlToValidate="txtPassword"
                                    ForeColor="Red" SetFocusOnError="true" ErrorMessage="Please enter the password" ValidationGroup="SignUp"></asp:RequiredFieldValidator>
                            </div>
                            <div class="hnm-input">
                                <p class="hnm-input__text-label">Confirm Password*</p>
                                <asp:TextBox ID="txtConfirmPswd" runat="server" CssClass="hnm-input__text" TextMode="Password"></asp:TextBox>
                                <asp:RequiredFieldValidator ID="reqConfirm" runat="server" Display="Dynamic" ControlToValidate="txtConfirmPswd"
                                    ForeColor="Red" SetFocusOnError="true" ErrorMessage="Please enter the confirm password" ValidationGroup="SignUp"></asp:RequiredFieldValidator>
                                <asp:CompareValidator ID="CVPassword" runat="server" ErrorMessage="Password should be same." class="hnm-input__error" Display="Dynamic"
                                    ForeColor="Red" ControlToValidate="txtConfirmPswd" ControlToCompare="txtPassword" ValidationGroup="SignUp">
                                </asp:CompareValidator>
                                <asp:Label ID="lblMsg" runat="server" CssClass="hnm-input__error"></asp:Label>
                            </div>
                            <div class="hnm-login__btn-sec">
                                <div class="hnm-login__btn-left">
                                    <asp:LinkButton ID="lnkRegister" runat="server" CssClass="hnm-button" CausesValidation="true" ValidationGroup="SignUp" OnClick="lnkRegister_Click">Submit</asp:LinkButton>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <uc1:ErrorDisplay runat="server" ID="ErrorDisplay" />
            <dx:ASPxPopupControl ID="ASPxPopupControlConfirm" runat="server" AllowDragging="True" Modal="True" Theme="Moderno" PopupHorizontalAlign="WindowCenter" CloseAction="CloseButton" ShowCloseButton="true" CloseOnEscape="false" HeaderText="Confirm" ShowHeader="true" ModalBackgroundStyle-BackColor="DimGray" ModalBackgroundStyle-Opacity="95">
                <SettingsAdaptivity Mode="Always" VerticalAlign="WindowCenter" MaxWidth="900px" />
                <ContentCollection>
                    <dx:PopupControlContentControl runat="server">
                        <div class="row">
                            <div class="col col-md-12">
                                <hr />
                                <div class="row">
                                    <div class="col col-sm-10">
                                        <p>
                                            <asp:Label ID="lblSCMessage" runat="server" Text="A previous failed registration attempt was found for this email."></asp:Label>
                                        </p>
                                        <p>
                                            <asp:Label ID="lblSCMessageYesNo" runat="server" Text="Do you want to proceed with registration?"></asp:Label>
                                        </p>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col col-sm-10">
                                        <asp:LinkButton ID="lnkProceed" class="ppim-btn__secondary" runat="server" Text="Yes, Proceed" OnClick="lnkProceed_Click" CausesValidation="false"></asp:LinkButton>
                                        <asp:LinkButton ID="lnkCancel" class="ppim-btn__secondary" runat="server" Text="No, Cancel" data-dismiss="modal"></asp:LinkButton>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </dx:PopupControlContentControl>
                </ContentCollection>
            </dx:ASPxPopupControl>
        </ContentTemplate>
    </asp:UpdatePanel>
</asp:Content>

