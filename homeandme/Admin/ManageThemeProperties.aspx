<%@ Page Title="" Language="C#" MasterPageFile="~/Admin/AdminMasterPage.master" AutoEventWireup="true" CodeFile="ManageThemeProperties.aspx.cs" Inherits="Admin_ManageThemeProperties" %>

<%@ Register Assembly="DevExpress.Web.v19.2, Version=19.2.5.0, Culture=neutral, PublicKeyToken=b88d1754d700e49a" Namespace="DevExpress.Web" TagPrefix="dx" %>
<%@ Register Assembly="AjaxControlToolkit" Namespace="AjaxControlToolkit" TagPrefix="asp" %>
<%@ Register Src="~/Admin/Controls/AdminControls/AccountMenu.ascx" TagPrefix="dx" TagName="AccountMenu" %>
<%@ Register Assembly="DevExpress.Web.ASPxTreeList.v19.2, Version=19.2.5.0, Culture=neutral, PublicKeyToken=b88d1754d700e49a"
    Namespace="DevExpress.Web.ASPxTreeList" TagPrefix="dx" %>
<%@ Register Src="~/Admin/Controls/Usercontrols/ErrorDisplay.ascx" TagPrefix="dx" TagName="ErrorDisplay" %>


<asp:Content ID="Content1" ContentPlaceHolderID="head" runat="Server">
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
                    <a href="#" class="breadcrumb--active">Properties</a>
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
                            <h2 class="font-medium text-base mr-auto">Properties
                            </h2>
                            <div class="w-full sm:w-auto flex items-center sm:ml-auto mt-3 sm:mt-0">
                                <asp:LinkButton ID="lnkNew" runat="server" CssClass="button w-full xl:w-32 text-white bg-theme-1" Text="Add new" ToolTip="Add new" OnClick="lnkNew_Click" />
                            </div>
                        </div>
                        <div id="divGrid" runat="server">
                            <div class="p-5">
                                <div class="preview overflow">
                                    <dx:ASPxGridView ID="GridThemeProperties" runat="server" ClientInstanceName="GridThemeProperties" Width="100%" AutoGenerateColumns="False" KeyFieldName="ThemePropertyID"
                                        EnableRowsCache="false" EnableCallBacks="false" DataSourceID="dsThemeProperties" Styles-AlternatingRow-Enabled="True">
                                        <SettingsAdaptivity AdaptivityMode="HideDataCells" AllowOnlyOneAdaptiveDetailExpanded="true"></SettingsAdaptivity>
                                        <Columns>
                                            <dx:GridViewDataTextColumn FieldName="SaveType" ReadOnly="True" VisibleIndex="0" Caption="Save Type" HeaderStyle-Font-Bold="true" CellStyle-HorizontalAlign="Left">
                                            </dx:GridViewDataTextColumn>
                                            <dx:GridViewDataTextColumn FieldName="PropertyType" ReadOnly="True" VisibleIndex="0" Caption="Property Type" HeaderStyle-Font-Bold="true" CellStyle-HorizontalAlign="Left">
                                            </dx:GridViewDataTextColumn>
                                            <dx:GridViewDataTextColumn FieldName="NoOfRoom" ReadOnly="True" VisibleIndex="0" Caption="No. of Room" HeaderStyle-Font-Bold="true" CellStyle-HorizontalAlign="Left">
                                            </dx:GridViewDataTextColumn>
                                        </Columns>
                                        <SettingsPager PageSize="10" NumericButtonCount="6" />
                                        <Settings ShowFilterRow="true" />
                                    </dx:ASPxGridView>
                                    <asp:SqlDataSource ID="dsThemeProperties" runat="server" ConnectionString="<%$ ConnectionStrings:ConnectionString %>"
                                        SelectCommand="GetThemePropertyDetails" SelectCommandType="StoredProcedure">
                                        <SelectParameters>
                                            <asp:SessionParameter Name="ThemeID" SessionField="ThemeID" />
                                        </SelectParameters>
                                    </asp:SqlDataSource>
                                </div>
                            </div>
                        </div>
                        <div id="divForm" runat="server" visible="false">
                            <div class="p-5">
                                <div class="preview">
                                    <div class="mt-1">
                                        <div class="mangPromFormOut">
                                            <div class="mt-3 inputLt">
                                                <label>Save Type:</label>
                                                <asp:DropDownList ID="ddlSaveType" runat="server" CssClass="input w-full border" Width="100%">
                                                    <asp:ListItem Value="-1">---Select---</asp:ListItem>
                                                    <asp:ListItem Value="0">Resale</asp:ListItem>
                                                    <asp:ListItem Value="1">New</asp:ListItem>
                                                </asp:DropDownList>
                                                <asp:RequiredFieldValidator ID="rfvSaveType" runat="server" ControlToValidate="ddlSaveType" InitialValue="-1" SetFocusOnError="true" ForeColor="Red" ErrorMessage="Please select save type" ValidationGroup="Theme"></asp:RequiredFieldValidator>
                                            </div>
                                        </div>
                                        <div class="mangPromFormOut">
                                            <div class="mt-3 inputLt">
                                                <label>Property Type:</label><br />
                                                <asp:DropDownList ID="ddlPropertyType" runat="server" CssClass="input w-full border" Width="100%" DataSourceID="dsProperties"
                                                    DataValueField="PropertyTypeID" DataTextField="PropertyType" OnSelectedIndexChanged="ddlPropertyType_SelectedIndexChanged" AutoPostBack="true">
                                                </asp:DropDownList>
                                                <asp:SqlDataSource ID="dsProperties" runat="server" ConnectionString="<%$ ConnectionStrings:ConnectionString %>"
                                                    SelectCommand="SELECT '-1' AS PropertyTypeID, '---Select---' AS PropertyType UNION SELECT PropertyTypeID, PropertyType FROM PropertyTypes WHERE Status = 1 " SelectCommandType="Text"></asp:SqlDataSource>
                                                <asp:RequiredFieldValidator ID="rfvThemeActive" runat="server" ControlToValidate="ddlPropertyType" InitialValue="-1" SetFocusOnError="true" ForeColor="Red" ErrorMessage="Please select property type" ValidationGroup="Theme"></asp:RequiredFieldValidator>
                                            </div>
                                            <div class="mt-3 inputRt">
                                                <label>No. of Rooms:</label><br />
                                                <asp:DropDownList ID="ddlRooms" runat="server" CssClass="input w-full border" Width="100%" DataTextField="NoOfRoom" DataValueField="PropertyTypeRoomID">
                                                </asp:DropDownList>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="mt-1">
                                        <asp:Button ID="btnSave" runat="server" Class="button bg-theme-1 text-white w-24" OnClick="btnSave_Click" Text="Save"
                                            ValidationGroup="Theme" CausesValidation="true" />
                                        <asp:Button ID="btnCancel" runat="server" Text="Cancel" OnClick="btnCancel_Click" class="button w-24 mr-1 mb-2 bg-gray-200 text-gray-600 ml-2" CausesValidation="false" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <dx:ErrorDisplay runat="server" ID="ErrorDisplay" />
        </ContentTemplate>
    </asp:UpdatePanel>
</asp:Content>

