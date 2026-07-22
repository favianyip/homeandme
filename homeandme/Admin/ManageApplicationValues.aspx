<%@ Page Title="" Language="C#" MasterPageFile="~/Admin/AdminMasterPage.master" AutoEventWireup="true" CodeFile="ManageApplicationValues.aspx.cs" Inherits="Admin_ManageApplicationValues" %>

<%@ Register Assembly="DevExpress.Web.ASPxTreeList.v19.2, Version=19.2.5.0, Culture=neutral, PublicKeyToken=b88d1754d700e49a"
    Namespace="DevExpress.Web.ASPxTreeList" TagPrefix="dx" %>
<%@ Register Assembly="DevExpress.Web.v19.2, Version=19.2.5.0, Culture=neutral, PublicKeyToken=b88d1754d700e49a" Namespace="DevExpress.Web" TagPrefix="dx" %>
<%@ Register Assembly="AjaxControlToolkit" Namespace="AjaxControlToolkit" TagPrefix="asp" %>
<%@ Register Src="~/Controls/Usercontrols/ErrorDisplay.ascx" TagPrefix="uc1" TagName="ErrorDisplay" %>
<%@ Register Src="~/Admin/Controls/AdminControls/AccountMenu.ascx" TagPrefix="uc1" TagName="AccountMenu" %>

<asp:Content ID="Content1" ContentPlaceHolderID="head" runat="Server">
</asp:Content>
<asp:Content ID="Content2" ContentPlaceHolderID="ContentPlaceHolder1" runat="Server">
    <asp:ToolkitScriptManager runat="server"></asp:ToolkitScriptManager>
    <div class="top-bar">
        <div class="breadcrumb mr-auto hidden sm:flex">
            <a href="AdminDashboard.aspx" class="">Home</a>
            <i data-feather="chevron-right" class="breadcrumb__icon"></i>
            <a href="#" class="breadcrumb--active">Application Values</a>
        </div>
        <div class="relative mr-3 sm:mr-6">
            <div class="search hidden sm:block">
            </div>
        </div>
        <uc1:accountmenu runat="server" id="AccountMenu" />
    </div>
    <div class="grid grid-cols-12 gap-6 mt-5">
        <div class="col-span-12 lg:col-span-12">
            <div class="box">
                <div class="flex flex-col sm:flex-row items-center p-5 border-b border-gray-200">
                    <h2 class="font-medium text-base mr-auto">Application Values
                    </h2>
                    <div class="w-full sm:w-auto flex items-center sm:ml-auto mt-3 sm:mt-0">
                        <asp:Button ID="btnCreateNew" runat="server" CssClass="button bg-theme-1 text-white " Text="Create New" OnClick="btnCreateNew_Click" />
                    </div>
                </div>
                <div id="divGrid" runat="server">
                    <div class="p-5">
                        <div class="preview">
                            <dx:aspxgridview id="GridApplicationDetails" runat="server" clientinstancename="GridApplicationDetails" width="100%" autogeneratecolumns="False" keyfieldname="ApplicationDetailID"
                                enablerowscache="false" enablecallbacks="false" datasourceid="dsApplicationDetails">
                                <settingsadaptivity adaptivitymode="HideDataCells" allowonlyoneadaptivedetailexpanded="true"></settingsadaptivity>
                                <columns>
                                    <dx:gridviewdatatextcolumn fieldname="ItemName" caption="Item Name" width="350px">
                                    </dx:gridviewdatatextcolumn>
                                    <dx:gridviewdatatextcolumn fieldname="ItemCode" caption="Item Code" width="300px" visible="false">
                                    </dx:gridviewdatatextcolumn>
                                    <dx:gridviewdatatextcolumn fieldname="TypeText" caption="Type" width="300px">
                                    </dx:gridviewdatatextcolumn>
                                    <dx:gridviewdatatextcolumn fieldname="ItemData" caption="Item Data">
                                    </dx:gridviewdatatextcolumn>
                                    <dx:gridviewdatatextcolumn fieldname="Status" caption="Status" width="100px">
                                    </dx:gridviewdatatextcolumn>
                                    <dx:gridviewdatacolumn fieldname="ApplicationDetailID" width="90px" caption=" " adaptivepriority="0">
                                        <dataitemtemplate>
                                            <div class="dropdown relative">
                                                <div class="dropdown-toggle button inline-block bg-theme-1 text-white">Options</div>
                                                <div class="dropdown-box mt-10 absolute w-40 top-0 left-0 z-20">
                                                    <div class="dropdown-box__content box p-2">
                                                        <asp:LinkButton ID="lnkEdit" runat="server" CssClass="block p-2 transition duration-300 ease-in-out bg-white hover:bg-gray-200 rounded-md" OnClick="lnkEdit_Click" CommandArgument='<% #Bind("ApplicationDetailID")%>'>Edit</asp:LinkButton>
                                                    </div>
                                                </div>
                                            </div>
                                        </dataitemtemplate>
                                        <settings allowheaderfilter="False" allowautofilter="False" />
                                    </dx:gridviewdatacolumn>
                                </columns>
                                <settingspager pagesize="10" numericbuttoncount="6" />
                                <settings showfilterrow="false" />
                            </dx:aspxgridview>
                            <asp:SqlDataSource ID="dsApplicationDetails" runat="server" ConnectionString="<%$ ConnectionStrings:ConnectionString %>"
                                SelectCommand="GetApplicationDetails"></asp:SqlDataSource>
                            <asp:HiddenField ID="hdnID" runat="server" />
                            <asp:HiddenField ID="hdnItemType" runat="server" />
                        </div>
                    </div>
                </div>
                <div id="divForm" runat="server" visible="false">
                    <div class="p-5" id="vertical-form">
                        <div class="preview">
                            <div class="mt-3 dropDowndxe">
                                <label>Status:</label>
                                <asp:DropDownList ID="ddlStatus" runat="server" CssClass="input w-full border mt-2 dateList">
                                    <asp:ListItem Text="InActive" Value="0" />
                                    <asp:ListItem Text="Active" Value="1" />
                                </asp:DropDownList>
                            </div>
                            <div class="mt-3">
                                <b>
                                    <label>Name : *</label></b>
                                <asp:TextBox runat="server" ID="txtName" CssClass="input w-full border mt-2" Width="100%"></asp:TextBox>
                                <asp:RequiredFieldValidator ID="RequiredFieldValidator1" runat="server" ControlToValidate="txtName" SetFocusOnError="true" ForeColor="Red" ErrorMessage="Please enter the name." ValidationGroup="application" Display="Dynamic"></asp:RequiredFieldValidator>
                            </div>
                            <div class="mt-3">
                                <b>
                                    <label>Code : *</label></b>
                                <asp:TextBox runat="server" ID="txtCode" CssClass="input w-full border mt-2" Width="100%"></asp:TextBox>
                                <asp:RequiredFieldValidator ID="RequiredFieldValidator2" runat="server" ControlToValidate="txtCode" SetFocusOnError="true" ForeColor="Red" ErrorMessage="Please enter the code." ValidationGroup="application" Display="Dynamic"></asp:RequiredFieldValidator>
                            </div>
                            <div class="mt-3">
                                <b>
                                    <label>Type : *</label></b>
                                <asp:DropDownList ID="ddlType" runat="server" CssClass="input w-full border mt-2 dateList" OnSelectedIndexChanged="ddlType_SelectedIndexChanged" AutoPostBack="true">
                                    <asp:ListItem Text="--Select--" Value="-1" />
                                    <asp:ListItem Text="Fee" Value="1" />
                                    <asp:ListItem Text="Loan Form" Value="2" />
                                    <asp:ListItem Text="Submission Form" Value="3" />
                                </asp:DropDownList>
                                <asp:RequiredFieldValidator ID="reqType" runat="server" Display="Dynamic" InitialValue="-1" ControlToValidate="ddlType" ForeColor="Red" ErrorMessage="Please select the type." ValidationGroup="application"></asp:RequiredFieldValidator>
                            </div>
                            <div class="mt-3" id="divAmountOrPercentage" runat="server" visible="false">
                                <b>
                                    <label>Amount Or Percentage :</label></b>
                                <asp:RadioButtonList ID="rblAmountOrPercentage" runat="server" RepeatDirection="Vertical">
                                    <asp:ListItem Text=" Amount" Value="1" Selected="True"></asp:ListItem>
                                    <asp:ListItem Text=" Percentage of Renovation Cost" Value="2"></asp:ListItem>
                                </asp:RadioButtonList>
                            </div>
                            <div class="mt-3" id="divIsLoanFee" runat="server" visible="false">
                                <b>
                                    <label>Is Loan Fee :</label></b>
                                <asp:CheckBox ID="chkIsLoanFee" runat="server" />
                            </div>
                            <div class="mt-3" id="divFeeType" runat="server" visible="false">
                                <b>
                                    <label>Amount : *</label></b>
                                <asp:TextBox runat="server" ID="txtItemAmount" CssClass="input w-full border mt-2" Width="100%"></asp:TextBox>
                                <asp:RequiredFieldValidator ID="reqAmount" runat="server" ControlToValidate="txtItemAmount" SetFocusOnError="true" ForeColor="Red" ErrorMessage="Please enter the amount." ValidationGroup="application" Display="Dynamic"></asp:RequiredFieldValidator>
                            </div>
                            <div class="mt-3 mb-2" id="divFileType" runat="server" visible="false">
                                <b>
                                    <label>File : *</label></b>
                                <asp:FileUpload ID="flItemFiles" runat="server" CssClass="input w-full border mt-2" Width="100%" />
                                <b>
                                    <label>Existing File URL: </label>
                                </b>&nbsp;<asp:Label ID="lblCurrentFileURL" runat="server"></asp:Label>
                            </div>
                            <asp:Button ID="btnUpdate" runat="server" class="button bg-theme-1 text-white mt-5 w-24" Text="SAVE" ValidationGroup="application" OnClick="btnUpdate_Click"></asp:Button>
                            <asp:Button ID="btnCancel" runat="server" class="button w-24 ml-2 mb-2 bg-gray-200 text-gray-600" Text="CANCEL" CausesValidation="false" OnClick="btnCancel_Click"></asp:Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <uc1:errordisplay runat="server" id="ErrorDisplay" />
</asp:Content>

