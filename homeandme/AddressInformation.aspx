<%@ Page Title="" Language="C#" MasterPageFile="~/DashboardMasterPage.master" AutoEventWireup="true" CodeFile="AddressInformation.aspx.cs" Inherits="AddressInformation" %>

<%@ Register Assembly="AjaxControlToolkit" Namespace="AjaxControlToolkit" TagPrefix="asp" %>

<asp:Content ID="Content1" ContentPlaceHolderID="head" runat="Server">
</asp:Content>
<asp:Content ID="Content2" ContentPlaceHolderID="ContentPlaceHolder1" runat="Server">
    <asp:ToolkitScriptManager ID="sm" runat="server" />
    <asp:UpdatePanel runat="server">
        <ContentTemplate>
            <h3 class="hnm-sub-head">Address Information</h3>
            <div class="hnm-box-head hnm-box-head--two-col">
                <div class="hnm-box-head__inner">
                    <h3 class="hnm-box-head__title">Site Address</h3>
                    <div class="hnm-box-head__cnt">
                        <div class="hnm-input">
                            <p class="hnm-input__text-label">Name</p>
                            <asp:TextBox ID="txtSiteAdddressName" runat="server" CssClass="hnm-input__text"></asp:TextBox>
                            <asp:RequiredFieldValidator ID="reqName" runat="server" Display="Dynamic" ControlToValidate="txtSiteAdddressName"
                                ForeColor="Red" SetFocusOnError="true" ErrorMessage="Please enter the name" ValidationGroup="address"></asp:RequiredFieldValidator>
                        </div>
                        <div class="hnm-input">
                            <p class="hnm-input__text-label">Mobile</p>
                            <asp:TextBox ID="txtSiteAddressMobile" runat="server" CssClass="hnm-input__text"></asp:TextBox>
                            <asp:FilteredTextBoxExtender ID="fteSiteAddressMobile" runat="server" TargetControlID="txtSiteAddressMobile" ValidChars="+-0123456789"></asp:FilteredTextBoxExtender>
                            <asp:RequiredFieldValidator ID="reqSiteAddressMobile" runat="server" Display="Dynamic" ControlToValidate="txtSiteAddressMobile"
                                ForeColor="Red" SetFocusOnError="true" ErrorMessage="Please enter the mobile number" ValidationGroup="address"></asp:RequiredFieldValidator>
                        </div>
                        <div class="hnm-input">
                            <p class="hnm-input__text-label">Zip</p>
                            <asp:TextBox ID="txtSiteAddressZipCode" runat="server" CssClass="hnm-input__text"></asp:TextBox>
                            <asp:FilteredTextBoxExtender ID="fteSiteAddressZipCode" runat="server" TargetControlID="txtSiteAddressZipCode" ValidChars="+-0123456789"></asp:FilteredTextBoxExtender>
                            <asp:RequiredFieldValidator ID="reqSiteAddressZipCode" runat="server" Display="Dynamic" ControlToValidate="txtSiteAddressZipCode"
                                ForeColor="Red" SetFocusOnError="true" ErrorMessage="Please enter the zipcode" ValidationGroup="address"></asp:RequiredFieldValidator>
                        </div>
                        <div class="hnm-input">
                            <p class="hnm-input__text-label">Address 1</p>
                            <asp:TextBox ID="txtSiteAddress1" runat="server" CssClass="hnm-input__text"></asp:TextBox>
                            <asp:RequiredFieldValidator ID="reqSiteAddress1" runat="server" Display="Dynamic" ControlToValidate="txtSiteAddress1"
                                ForeColor="Red" SetFocusOnError="true" ErrorMessage="Please enter the address 1" ValidationGroup="address"></asp:RequiredFieldValidator>
                        </div>
                        <div class="hnm-input">
                            <p class="hnm-input__text-label">Address 2</p>
                            <asp:TextBox ID="txtSiteAddress2" runat="server" CssClass="hnm-input__text"></asp:TextBox>
                            <asp:RequiredFieldValidator ID="reqSiteAddress2" runat="server" Display="Dynamic" ControlToValidate="txtSiteAddress2"
                                ForeColor="Red" SetFocusOnError="true" ErrorMessage="Please enter the address 2" ValidationGroup="address"></asp:RequiredFieldValidator>
                        </div>
                        <div class="hnm-input">
                            <p class="hnm-input__text-label">State</p>
                            <asp:TextBox ID="txtSiteAddressState" runat="server" CssClass="hnm-input__text"></asp:TextBox>
                            <asp:RequiredFieldValidator ID="reqSiteAddressState" runat="server" Display="Dynamic" ControlToValidate="txtSiteAddressState"
                                ForeColor="Red" SetFocusOnError="true" ErrorMessage="Please enter the state" ValidationGroup="address"></asp:RequiredFieldValidator>
                        </div>
                        <div class="hnm-input">
                            <p class="hnm-input__text-label">Country</p>
                            <asp:TextBox ID="txtSiteAddressCountry" runat="server" CssClass="hnm-input__text"></asp:TextBox>
                            <asp:RequiredFieldValidator ID="reqSiteAddressCountry" runat="server" Display="Dynamic" ControlToValidate="txtSiteAddressCountry"
                                ForeColor="Red" SetFocusOnError="true" ErrorMessage="Please enter the country" ValidationGroup="address"></asp:RequiredFieldValidator>
                        </div>
                    </div>
                </div>
                <div class="hnm-box-head__inner">
                    <h3 class="hnm-box-head__title">Billing Address</h3>
                    <div class="hnm-box-head__cnt">
                        <div class="hnm-input">
                            <p class="hnm-input__text-label">Name</p>
                            <asp:TextBox ID="txtBillingAddressName" runat="server" CssClass="hnm-input__text"></asp:TextBox>
                            <asp:RequiredFieldValidator ID="reqBillingAddressName" runat="server" Display="Dynamic" ControlToValidate="txtBillingAddressName"
                                ForeColor="Red" SetFocusOnError="true" ErrorMessage="Please enter the name" ValidationGroup="address"></asp:RequiredFieldValidator>
                        </div>
                        <div class="hnm-input">
                            <p class="hnm-input__text-label">Mobile</p>
                            <asp:TextBox ID="txtBillingAddressMobile" runat="server" CssClass="hnm-input__text"></asp:TextBox>
                            <asp:FilteredTextBoxExtender ID="fteBillingAddressMobile" runat="server" TargetControlID="txtBillingAddressMobile" ValidChars="+-0123456789"></asp:FilteredTextBoxExtender>
                            <asp:RequiredFieldValidator ID="reqBillingAddressMobile" runat="server" Display="Dynamic" ControlToValidate="txtBillingAddressMobile"
                                ForeColor="Red" SetFocusOnError="true" ErrorMessage="Please enter the mobile number" ValidationGroup="address"></asp:RequiredFieldValidator>
                        </div>
                        <div class="hnm-input">
                            <p class="hnm-input__text-label">Zip</p>
                            <asp:TextBox ID="txtBillingAddressZipCode" runat="server" CssClass="hnm-input__text"></asp:TextBox>
                            <asp:FilteredTextBoxExtender ID="fteBillingAddressZipCode" runat="server" TargetControlID="txtBillingAddressZipCode" ValidChars="+-0123456789"></asp:FilteredTextBoxExtender>
                            <asp:RequiredFieldValidator ID="reqBillingAddressZipCode" runat="server" Display="Dynamic" ControlToValidate="txtBillingAddressZipCode"
                                ForeColor="Red" SetFocusOnError="true" ErrorMessage="Please enter the zip code" ValidationGroup="address"></asp:RequiredFieldValidator>
                        </div>
                        <div class="hnm-input">
                            <p class="hnm-input__text-label">Address 1</p>
                            <asp:TextBox ID="txtBillingAddress1" runat="server" CssClass="hnm-input__text"></asp:TextBox>
                            <asp:RequiredFieldValidator ID="reqBillingAddress1" runat="server" Display="Dynamic" ControlToValidate="txtBillingAddress1"
                                ForeColor="Red" SetFocusOnError="true" ErrorMessage="Please enter the address 1" ValidationGroup="address"></asp:RequiredFieldValidator>
                        </div>
                        <div class="hnm-input">
                            <p class="hnm-input__text-label">Address 2</p>
                            <asp:TextBox ID="txtBillingAddress2" runat="server" CssClass="hnm-input__text"></asp:TextBox>
                            <asp:RequiredFieldValidator ID="reqBillingAddress2" runat="server" Display="Dynamic" ControlToValidate="txtBillingAddress2"
                                ForeColor="Red" SetFocusOnError="true" ErrorMessage="Please enter the address 2" ValidationGroup="address"></asp:RequiredFieldValidator>
                        </div>
                        <div class="hnm-input">
                            <p class="hnm-input__text-label">State</p>
                            <asp:TextBox ID="txtBillingAddressState" runat="server" CssClass="hnm-input__text"></asp:TextBox>
                            <asp:RequiredFieldValidator ID="reqBillingAddressState" runat="server" Display="Dynamic" ControlToValidate="txtBillingAddressState"
                                ForeColor="Red" SetFocusOnError="true" ErrorMessage="Please enter the state" ValidationGroup="address"></asp:RequiredFieldValidator>
                        </div>
                        <div class="hnm-input">
                            <p class="hnm-input__text-label">Country</p>
                            <asp:TextBox ID="txtBillingAddressCountry" runat="server" CssClass="hnm-input__text"></asp:TextBox>
                            <asp:RequiredFieldValidator ID="reqBillingAddressCountry" runat="server" Display="Dynamic" ControlToValidate="txtBillingAddressCountry"
                                ForeColor="Red" SetFocusOnError="true" ErrorMessage="Please enter the country" ValidationGroup="address"></asp:RequiredFieldValidator>
                        </div>
                    </div>
                </div>
            </div>
            <div class="hnm-check-box hnm-checkout__check-addrs">
                <label>
                    <asp:CheckBox ID="chkIsSameAddress" runat="server" OnCheckedChanged="chkIsSameAddress_CheckedChanged" AutoPostBack="true" />
                    <span class="hnm-check-box__check"></span>
                    My billing address is the same as site address
                </label>
                <asp:LinkButton ID="btnSaveAddress" runat="server" Text="save" CssClass="hnm-button" OnClick="btnSaveAddress_Click" ValidationGroup="address" CausesValidation="true"></asp:LinkButton>
            </div>
            <asp:Label ID="lblMsg" runat="server" ForeColor="Red"></asp:Label>
        </ContentTemplate>
    </asp:UpdatePanel>
</asp:Content>

