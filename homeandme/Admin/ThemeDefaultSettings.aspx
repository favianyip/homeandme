<%@ Page Title="" Language="C#" MasterPageFile="~/Admin/AdminMasterPage.master" AutoEventWireup="true" CodeFile="ThemeDefaultSettings.aspx.cs" Inherits="Admin_ThemeDefaultSettings" %>

<%@ Register Assembly="DevExpress.Web.v19.2, Version=19.2.5.0, Culture=neutral, PublicKeyToken=b88d1754d700e49a" Namespace="DevExpress.Web" TagPrefix="dx" %>
<%@ Register Assembly="AjaxControlToolkit" Namespace="AjaxControlToolkit" TagPrefix="asp" %>
<%@ Register Src="~/Admin/Controls/AdminControls/AccountMenu.ascx" TagPrefix="dx" TagName="AccountMenu" %>

<asp:Content ID="Content1" ContentPlaceHolderID="head" runat="Server">
    <script type="text/javascript">        function popup(s, e) {            var mainDiv = document.getElementById(s.name + '_PW-1');            mainDiv.style.width = '600px';            s.SetWidth(mainDiv.clientWidth);            s.UpdatePosition();        }    </script>
</asp:Content>
<asp:Content ID="Content2" ContentPlaceHolderID="ContentPlaceHolder1" runat="Server">
    <asp:ToolkitScriptManager ID="sm" runat="server" />
    <asp:UpdatePanel runat="server" ID="up">
        <ContentTemplate>
            <div class="top-bar">
                <div class="breadcrumb mr-auto hidden sm:flex">
                    <a href="AdminDashboard.aspx" class="">Home</a>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="feather feather-chevron-right breadcrumb__icon">
                        <polyline points="9 18 15 12 9 6"></polyline></svg>
                    <a href="ManageRoomSettings.aspx" class="breadcrumb--active">Rooms</a>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="feather feather-chevron-right breadcrumb__icon">
                        <polyline points="9 18 15 12 9 6"></polyline></svg>
                    <a href="ManageThemeSettings.aspx" class="breadcrumb--active">Themes</a>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="feather feather-chevron-right breadcrumb__icon">
                        <polyline points="9 18 15 12 9 6"></polyline></svg>
                    <a href="#" class="breadcrumb--active">Default Settings</a>
                </div>
                <div class="relative mr-3 sm:mr-6">
                    <div class="search hidden sm:block">
                    </div>
                </div>
                <dx:AccountMenu runat="server" ID="AccountMenu" />
            </div>
            <div class="grid grid-cols-12 gap-6 mt-5">
                <div class="col-span-12 lg:col-span-12">
                    <div class="box">
                        <div class="flex flex-col sm:flex-row items-center p-5 border-b border-gray-200">
                            <h2 class="font-medium text-base mr-auto">Themes Default Settings
                            </h2>
                            <div class="w-full sm:w-auto flex items-center sm:ml-auto mt-3 sm:mt-0">
                                <asp:LinkButton ID="lnkBackToThemes" runat="server" CssClass="button w-full xl:w-32 text-white bg-theme-1" Text="Back to Themes" ToolTip="Back to Themes" OnClick="lnkBackToThemes_Click" />
                            </div>
                        </div>
                        <div class="p-5">
                            <div class="preview overflow">
                                <dx:ASPxGridView ID="GridDefaultWorkTypes" runat="server" ClientInstanceName="GridDefaultWorkTypes" Width="100%" AutoGenerateColumns="False" KeyFieldName="SubsubOptionL3ID"
                                    EnableRowsCache="false" EnableCallBacks="false" DataSourceID="ThemeSource" Styles-AlternatingRow-Enabled="True">
                                    <SettingsAdaptivity AdaptivityMode="HideDataCells" AllowOnlyOneAdaptiveDetailExpanded="true"></SettingsAdaptivity>
                                    <Columns>
                                        <dx:GridViewDataTextColumn FieldName="OptionLevel" ReadOnly="True" VisibleIndex="0" Caption="Work Type" HeaderStyle-Font-Bold="true" CellStyle-HorizontalAlign="Left">
                                        </dx:GridViewDataTextColumn>
                                        <dx:GridViewDataTextColumn FieldName="UOM" ReadOnly="True" VisibleIndex="0" Caption="UOM" HeaderStyle-Font-Bold="true" CellStyle-HorizontalAlign="Left">
                                        </dx:GridViewDataTextColumn>
                                        <dx:GridViewDataTextColumn FieldName="Length" ReadOnly="True" VisibleIndex="0" Caption="Length(ft)" HeaderStyle-Font-Bold="true" CellStyle-HorizontalAlign="Left">
                                        </dx:GridViewDataTextColumn>
                                        <dx:GridViewDataTextColumn FieldName="Width" ReadOnly="True" VisibleIndex="0" Caption="Width(ft)" HeaderStyle-Font-Bold="true" CellStyle-HorizontalAlign="Left">
                                        </dx:GridViewDataTextColumn>
                                        <dx:GridViewDataTextColumn FieldName="Numbers" ReadOnly="True" VisibleIndex="0" Caption="Quantity" HeaderStyle-Font-Bold="true" CellStyle-HorizontalAlign="Left">
                                        </dx:GridViewDataTextColumn>
                                        <dx:GridViewDataTextColumn FieldName="Rate" ReadOnly="True" VisibleIndex="0" Caption="Price" HeaderStyle-Font-Bold="true" CellStyle-HorizontalAlign="Left">
                                        </dx:GridViewDataTextColumn>
                                        <dx:GridViewDataTextColumn ReadOnly="True" VisibleIndex="2" HeaderStyle-Font-Bold="true">
                                            <DataItemTemplate>
                                                <div class="dropdown relative">
                                                    <div class="dropdown-toggle button inline-block bg-theme-1 text-white">Options</div>
                                                    <div class="dropdown-box mt-10 absolute w-40 top-0 left-0 z-20">
                                                        <div class="dropdown-box__content box p-2 mangSerRateOptBut">
                                                            <asp:LinkButton ID="btnConfigure" runat="server" Text="Configure" CssClass="block p-2 transition duration-300 ease-in-out bg-white hover:bg-gray-200 rounded-md" OnClick="btnConfigure_Click" CommandArgument='<% #Bind("SubsubOptionL3ID")%>' />
                                                        </div>
                                                    </div>
                                                </div>
                                            </DataItemTemplate>
                                        </dx:GridViewDataTextColumn>
                                    </Columns>
                                    <SettingsPager PageSize="10" NumericButtonCount="6" />
                                    <Settings ShowFilterRow="true" />
                                </dx:ASPxGridView>
                                <asp:SqlDataSource ID="ThemeSource" runat="server" ConnectionString="<%$ ConnectionStrings:ConnectionString %>"
                                    SelectCommand="GetDefaultWorkTypesForThemes @ThemeID">
                                    <SelectParameters>
                                        <asp:SessionParameter Name="ThemeID" SessionField="ThemeID" />
                                    </SelectParameters>
                                </asp:SqlDataSource>
                            </div>
                        </div>
                    </div>
                    <asp:HiddenField ID="HfDefaultWorkTypeID" runat="server" />
                </div>
            </div>
            <dx:ASPxPopupControl ID="PopupConfigure" runat="server" ClientInstanceName="PopupConfigure" PopupHorizontalAlign="WindowCenter" PopupVerticalAlign="WindowCenter">
                <ClientSideEvents PopUp="popup" Shown="function(s){setTimeout(function() {s.UpdatePosition();}, 0);}" />
                <HeaderContentTemplate>
                    <h4 class="modal-title">Price Management</h4>
                </HeaderContentTemplate>
                <ContentCollection>
                    <dx:PopupControlContentControl ID="cc2">
                        <div class="p-5">
                            <div class="preview">
                                <div id="DivMeasurement" runat="server">
                                    <div>
                                        <label>Length(ft) :*</label>
                                        <asp:TextBox runat="server" ID="txtLength" CssClass="input w-full border mt-2" OnTextChanged="txtLength_TextChanged" AutoPostBack="true"></asp:TextBox>
                                        <asp:RequiredFieldValidator ID="rfvlength" runat="server" ControlToValidate="txtLength" SetFocusOnError="true" ForeColor="Red" ErrorMessage="*Required" ValidationGroup="Theme"></asp:RequiredFieldValidator>
                                    </div>
                                    <div>
                                        <label>Width(ft) :*</label><br />
                                        <asp:TextBox runat="server" ID="txtWidth" CssClass="input w-full border mt-2" OnTextChanged="txtWidth_TextChanged" AutoPostBack="true"></asp:TextBox>
                                        <asp:RequiredFieldValidator ID="rfvWidth" runat="server" ControlToValidate="txtWidth" SetFocusOnError="true" ForeColor="Red" ErrorMessage="*Required" ValidationGroup="Theme"></asp:RequiredFieldValidator>
                                    </div>
                                </div>
                                <div id="DivNumbers" runat="server">
                                    <label>Quantity :*</label><br />
                                    <asp:TextBox runat="server" ID="txtQuantity" CssClass="input w-full border mt-2" OnTextChanged="txtQuantity_TextChanged" AutoPostBack="true"></asp:TextBox>
                                    <asp:RequiredFieldValidator ID="rfvQuantity" runat="server" ControlToValidate="txtQuantity" SetFocusOnError="true" ForeColor="Red" ErrorMessage="*Required" ValidationGroup="Theme"></asp:RequiredFieldValidator>
                                </div>
                                <div>
                                    <label>Price : </label><asp:Label ID="lblPrice" runat="server" Font-Bold="true"></asp:Label>
                                </div>
                                <asp:Button ID="btnSaveDefault" runat="server" Class="button bg-theme-1 text-white mt-5 w-24" OnClick="btnSaveDefault_Click" Text="Save"
                                    ValidationGroup="Theme" CausesValidation="true" />
                                <asp:Button ID="btnCancelDefault" runat="server" Text="Cancel" OnClick="btnCancelDefault_Click" class="button w-24 mr-1 mb-2 bg-gray-200 text-gray-600 ml-2" CausesValidation="false" />
                                <br />
                                <asp:Label ID="lblMsg" runat="server" Font-Size="Small" ForeColor="Red" />
                            </div>
                        </div>
                    </dx:PopupControlContentControl>
                </ContentCollection>
                <ContentStyle>
                    <Paddings Padding="15px" />
                </ContentStyle>
            </dx:ASPxPopupControl>
        </ContentTemplate>
    </asp:UpdatePanel>
</asp:Content>


