<%@ Page Title="" Language="C#" MasterPageFile="~/MasterPage.master" AutoEventWireup="true" CodeFile="Contactus.aspx.cs" Inherits="Contactus" %>

<%@ Register Assembly="AjaxControlToolkit" Namespace="AjaxControlToolkit" TagPrefix="asp" %>
<%@ Register Src="~/Admin/Controls/Usercontrols/ErrorDisplay.ascx" TagPrefix="uc1" TagName="ErrorDisplay" %>

<asp:Content ID="Content1" ContentPlaceHolderID="head" runat="Server">
    <script>
        function onlyNumbers(evt) {
            var e = event || evt;
            var charCode = e.which || e.keyCode;
            if (charCode > 31 && (charCode < 48 || charCode > 57))
                return false;
            return true;
        }
    </script>
</asp:Content>
<asp:Content ID="Content2" ContentPlaceHolderID="ContentPlaceHolder1" runat="Server">
    <asp:ToolkitScriptManager runat="server"></asp:ToolkitScriptManager>
    <%-- <asp:UpdatePanel runat="server" UpdateMode="Always">
        <ContentTemplate>--%>
    <div class="contacts content-wrapper">
        <div class="grey-box grey-box--centered hnm-r-mt-6 hnm-r-mb-5">
            <h1 class="hnm-main-head">CONTACTS</h1>
            <p class="grey-box__text">Send a email to service@homenme.com or fill up the form and we will answer as soon as we can. Alternatively, you can call us.</p>
        </div>
        <div class="contacts__cont-icon-tab">
            <div class="contacts__cont-icon-txt">
                <div class="contacts__cont-icon">
                    <div class="contacts__cont-icon-bg">
                        <img src="../assets/images/location.svg">
                    </div>
                </div>
                <div class="contacts__cont-add-txt">
                    <h3>Location</h3>
                    <p>
                        HOMENME PTE LTD 66<br>
                        Horne Road #03-00<br>
                        Singapore 209073
                    </p>
                </div>
            </div>
            <div class="contacts__cont-icon-txt">
                <div class="contacts__cont-icon">
                    <div class="contacts__cont-icon-mail">
                        <img src="../assets/images/mail.svg">
                    </div>
                </div>
                <div class="contacts__cont-add-txt">
                    <h3>E-Mail</h3>
                    <a href="mailto:service@homenme.com">
                        <p>service@homenme.com</p>
                    </a>
                </div>
            </div>
            <div class="contacts__cont-icon-txt">
                <div class="contacts__cont-icon">
                    <div class="contacts__cont-icon-bg">
                        <img src="../assets/images/phone.svg">
                    </div>
                </div>
                <div class="contacts__cont-add-txt">
                    <h3>Contact Number</h3>
                    <a href="tel:67676868">
                        <p>6767 6868</p>
                    </a>
                </div>
            </div>
        </div>
        <div class="contacts__cont-map">
            <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3988.774991149814!2d103.85900051373527!3d1.3103315990443045!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31da197d24bbe5bd%3A0x8d5d3a9c80ee7704!2sIntellihub%20Pte%20Ltd!5e0!3m2!1sen!2sin!4v1633932103153!5m2!1sen!2sin" width="600" height="450" style="border: 0;" allowfullscreen="" loading="lazy"></iframe>
        </div>
        <asp:UpdatePanel runat="server" UpdateMode="Always">
            <ContentTemplate>
                <div class="contacts__cont-form-area">
                    <h4>Kindly fill up the form and let one of our experts contact you</h4>
                    <div class="contacts__cont-form-out">
                        <div class="contacts__contform-cont contacts__cont-two-col">
                            <div class="contacts__cont-name-phone">
                                <p class="hnm-input__text-label">Name*</p>
                                <asp:TextBox ID="txtName" runat="server" CssClass="hnm-input__text"></asp:TextBox>
                                <asp:RequiredFieldValidator ID="rfvName" runat="server" ControlToValidate="txtName" Display="Dynamic" ForeColor="Red" SetFocusOnError="true" ErrorMessage="Please enter the name" ValidationGroup="contact"></asp:RequiredFieldValidator>
                            </div>
                            <div class="contacts__cont-name-phone contacts__cont-phone">
                                <p class="hnm-input__text-label">Phone*</p>
                                <asp:TextBox ID="txtPhone" runat="server" CssClass="hnm-input__text" onKeyPress="return onlyNumbers(this);" MaxLength="10"></asp:TextBox>
                                <asp:RequiredFieldValidator ID="rfvphone" runat="server" ControlToValidate="txtPhone" Display="Dynamic" ForeColor="Red" SetFocusOnError="true" ErrorMessage="Please enter the phone number" ValidationGroup="contact"></asp:RequiredFieldValidator>
                            </div>
                        </div>
                        <div class="contacts__contform-cont">
                            <p class="hnm-input__text-label">Your Email*</p>
                            <asp:TextBox ID="txtEmail" runat="server" CssClass="hnm-input__text"></asp:TextBox>
                            <asp:RequiredFieldValidator ID="rfvEmail" runat="server" ControlToValidate="txtEmail" Display="Dynamic" ForeColor="Red" SetFocusOnError="true" ErrorMessage="Please enter the email" ValidationGroup="contact"></asp:RequiredFieldValidator>
                            <asp:RegularExpressionValidator ID="RegularExpressionValidator1" runat="server"
                                ErrorMessage="Invalid Email Address" ControlToValidate="txtEmail" ValidationGroup="contact"
                                SetFocusOnError="True" Display="Dynamic" ForeColor="Red"
                                ValidationExpression="\w+([-+.']\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*">
                            </asp:RegularExpressionValidator>
                        </div>
                        <div class="contacts__contform-cont">
                            <p class="hnm-input__text-label">Your Comment</p>
                            <asp:TextBox ID="txtComment" runat="server" CssClass="hnm-input__text contacts__text-area" TextMode="MultiLine"></asp:TextBox>
                        </div>
                        <div class="contacts__contform-cont contacts__cont-two-col contacts__agree-txt-outer">
                            <div class="contacts__cont-policy">
                                <div class="hnm-check-box">
                                    <div class="contacts__agree-txt">
                                        <asp:CheckBox ID="cbAgreePolicy" runat="server" Text="Agree that my submitted data is being collected and stored. For further details on handling user data, see our Privacy Policy" />
                                    </div>
                                </div>
                            </div>
                            <div class="contacts__cont-button">
                                <asp:Button ID="btnSendMessage" runat="server" CssClass="hnm-button" Text="Sent message" CausesValidation="true" ValidationGroup="contact" OnClick="btnSendMessage_Click" />
                            </div>
                        </div>
                    </div>
                </div>
                  <uc1:ErrorDisplay runat="server" ID="ErrorDisplay" />
            </ContentTemplate>
        </asp:UpdatePanel>
    </div>
  <%--  <uc1:ErrorDisplay runat="server" ID="ErrorDisplay" />--%>
    <%--</ContentTemplate>
    </asp:UpdatePanel>--%>
</asp:Content>

