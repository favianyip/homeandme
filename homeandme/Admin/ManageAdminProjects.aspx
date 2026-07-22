<%@ Page Title="" Language="C#" MasterPageFile="~/Admin/AdminMasterPage.master" AutoEventWireup="true" CodeFile="ManageAdminProjects.aspx.cs" Inherits="Admin_ManageAdminProjects" %>

<%@ Register Assembly="DevExpress.Web.v19.2, Version=19.2.5.0, Culture=neutral, PublicKeyToken=b88d1754d700e49a"
    Namespace="DevExpress.Web" TagPrefix="dx" %>
<%@ Register Assembly="AjaxControlToolkit" Namespace="AjaxControlToolkit" TagPrefix="asp" %>
<%@ Register Src="~/Admin/Controls/AdminControls/AccountMenu.ascx" TagPrefix="PageControl" TagName="AccountMenu" %>
<%@ Register Src="~/Admin/Controls/Usercontrols/ErrorDisplay.ascx" TagPrefix="PageControl" TagName="ErrorDisplay" %>

<asp:Content ID="Content1" ContentPlaceHolderID="head" runat="Server">
    <script type="text/javascript">
        function popup(s, e) {
            var mainDiv = document.getElementById(s.name + '_PW-1');
            mainDiv.style.width = '600px';
            s.SetWidth(mainDiv.clientWidth);
            s.UpdatePosition();
        }
    </script>
    <script type="text/javascript">
        function popupImage(s, e) {
            var mainDiv = document.getElementById(s.name + '_PW-1');
            mainDiv.style.width = '540px';
            s.SetWidth(mainDiv.clientWidth);
            s.UpdatePosition();
        }
    </script>
    <script type="text/javascript">
        function popUpStatus(s, e) {
            var mainDiv = document.getElementById(s.name + '_PW-1');
            mainDiv.style.width = '400px';
            s.SetWidth(mainDiv.clientWidth);
            s.UpdatePosition();
        }
    </script>
    <script type="text/javascript">
        function popupReschedule(s, e) {
            var mainDiv = document.getElementById(s.name + '_PW-1');
            mainDiv.style.width = '480px';
            s.SetWidth(mainDiv.clientWidth);
            s.UpdatePosition();
        }
    </script>
    <script type="text/javascript">
        function popupDocument(s, e) {
            var mainDiv = document.getElementById(s.name + '_PW-1');
            mainDiv.style.width = '360px';
            s.SetWidth(mainDiv.clientWidth);
            s.UpdatePosition();
        }
    </script>
</asp:Content>
<asp:Content ID="Content2" ContentPlaceHolderID="ContentPlaceHolder1" runat="Server">
    <asp:ToolkitScriptManager runat="server"></asp:ToolkitScriptManager>
    <div class="top-bar">
        <div class="breadcrumb mr-auto hidden sm:flex">
            <a href="AdminDashboard.aspx" class="">Home</a>
            <i data-feather="chevron-right" class="breadcrumb__icon"></i>
            <a href="#" class="breadcrumb--active">Project Management</a>
        </div>
        <div class="relative mr-3 sm:mr-6">
            <div class="search hidden sm:block">
            </div>
        </div>
        <pagecontrol:accountmenu runat="server" id="AccountMenu" />
    </div>
    <div class="grid grid-cols-12 gap-6 mt-5">
        <div class="col-span-12 lg:col-span-12">
            <div class="box">
                <div class="flex flex-col sm:flex-row items-center p-5 border-b border-gray-200">
                    <h2 class="font-medium text-base mr-auto"></h2>
                </div>
                <div id="divMain" runat="server">
                    <div class="p-5">
                        <div class="preview">
                            <dx:aspxpagecontrol id="CampSummaryTabPage" runat="server" width="100%" activetabindex="0" enablehierarchyrecreation="False" tabalign="Left" autopostback="true">
                                <tabpages>
                                    <dx:tabpage text="All projects" activetabstyle-font-bold="true">
                                        <contentcollection>
                                            <dx:contentcontrol>
                                                <div id="divProjects" runat="server">
                                                    <div class="flex flex-col sm:flex-row items-center p-5 delearWapper" id="DivtopItems" runat="server">
                                                        <div class="delearOuter">
                                                            <asp:TextBox ID="txtProjectSearch" runat="server" CssClass="input w-full border mt-2 mr-2"></asp:TextBox>
                                                            <asp:Button ID="btnProjectSearch" runat="server" CssClass="button bg-theme-1 text-white mt-2" Text="Search" OnClick="btnProjectSearch_Click" />
                                                        </div>
                                                        <div class="delearDate delearDateSub">
                                                            <dx:aspxdateedit id="DateFrom" clientinstancename="deStartUser" runat="server" placeholder="Start Date" tooltip="Start Date"
                                                                cssclass="dateList" displayformatstring="MMM/dd/yyyy" editformatstring="MMM/dd/yyyy" allownull="false" allowuserinput="false" nulltext="From date">
                                                            </dx:aspxdateedit>
                                                            <dx:aspxdateedit id="DateTo" clientinstancename="deEndUser" runat="server" placeholder="End Date"
                                                                cssclass="dateList" displayformatstring="MMM/dd/yyyy" editformatstring="MMM/dd/yyyy" allownull="false" allowuserinput="false" nulltext="To date">
                                                            </dx:aspxdateedit>
                                                            <div class="delearButFilter">
                                                                <asp:Button ID="btnFilter" runat="server" CssClass="button bg-theme-1 text-white w-24" Text="Filter" OnClick="btnFilter_Click" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div class="flex flex-col p-5">
                                                        <div id="divProjectGrid" runat="server">
                                                            <dx:aspxgridview id="GridProjects" runat="server" clientinstancename="GridProjects" width="100%" autogeneratecolumns="False" keyfieldname="ProjectID"
                                                                enablerowscache="false" enablecallbacks="false" datasourceid="ProjectsSource" styles-alternatingrow-enabled="True">
                                                                <settingsadaptivity adaptivitymode="HideDataCells" allowonlyoneadaptivedetailexpanded="true"></settingsadaptivity>
                                                                <columns>
                                                                    <dx:gridviewdatatextcolumn fieldname="ProjectID" caption="Request ID" readonly="true" visibleindex="1" cellstyle-horizontalalign="Left">
                                                                    </dx:gridviewdatatextcolumn>
                                                                    <dx:gridviewdatatextcolumn fieldname="RequestDate" caption="Request date" readonly="true" visibleindex="2" cellstyle-horizontalalign="Left">
                                                                    </dx:gridviewdatatextcolumn>
                                                                    <dx:gridviewdatatextcolumn fieldname="Name" readonly="True" caption="Username" visibleindex="3" cellstyle-horizontalalign="Left">
                                                                    </dx:gridviewdatatextcolumn>
                                                                    <dx:gridviewdatatextcolumn fieldname="UserEmail" readonly="True" caption="User Email" visibleindex="4" cellstyle-horizontalalign="Left">
                                                                    </dx:gridviewdatatextcolumn>
                                                                    <dx:gridviewdatatextcolumn fieldname="TimeSlot" caption="Time Slot" readonly="True" Visible="false" visibleindex="5" cellstyle-horizontalalign="Left">
                                                                    </dx:gridviewdatatextcolumn>
                                                                    <dx:gridviewdatatextcolumn fieldname="ProjectStatus" caption="Status" readonly="True" visibleindex="7" cellstyle-horizontalalign="Left">
                                                                    </dx:gridviewdatatextcolumn>
                                                                    <dx:gridviewdatacolumn fieldname="ProjectID" width="200px" caption="#" adaptivepriority="0" visibleindex="9">
                                                                        <dataitemtemplate>
                                                                            <div class="dropdown relative">
                                                                                <div class="dropdown-toggle button inline-block bg-theme-1 text-white">Options</div>
                                                                                <div class="dropdown-box mt-10 absolute w-40 top-0 left-0 z-20">
                                                                                    <div class="dropdown-box__content box p-2">
                                                                                        <asp:LinkButton ID="lnkPaymentStatus" runat="server" Text="Payment Status" CssClass="block p-2 transition duration-300 ease-in-out bg-white hover:bg-gray-200 rounded-md" OnClick="lnkPaymentStatus_Click" CommandArgument='<% #Bind("ProjectID")%>' />
                                                                                        <asp:LinkButton ID="lnkAssignPartners" runat="server" Text="Assign Partners" CssClass="block p-2 transition duration-300 ease-in-out bg-white hover:bg-gray-200 rounded-md" OnClick="lnkAssignPartners_Click" CommandArgument='<% #Bind("ProjectID")%>' />
                                                                                        <asp:LinkButton ID="lnkInitialPaymentInvoice" runat="server" Text="Initial Payment" CssClass="block p-2 transition duration-300 ease-in-out bg-white hover:bg-gray-200 rounded-md" OnClick="lnkInitialPaymentInvoice_Click" CommandArgument='<% #Bind("ProjectID")%>' />
                                                                                        <asp:LinkButton ID="lnkUpdateStatus" runat="server" Text="Update Status" CssClass="block p-2 transition duration-300 ease-in-out bg-white hover:bg-gray-200 rounded-md" OnClick="lnkUpdateStatus_Click" CommandArgument='<% #Bind("ProjectID")%>' />
                                                                                        <asp:LinkButton ID="lnkDownloadDocuments" runat="server" Text="Documents" CssClass="block p-2 transition duration-300 ease-in-out bg-white hover:bg-gray-200 rounded-md" ToolTip="For to download the project documents." OnClick="lnkDownloadDocuments_Click" CommandArgument='<% #Bind("ProjectID")%>' />
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </dataitemtemplate>
                                                                    </dx:gridviewdatacolumn>
                                                                </columns>
                                                                <settingspager pagesize="10" numericbuttoncount="3" />
                                                                <settings showfilterrow="true" />
                                                            </dx:aspxgridview>
                                                            <asp:SqlDataSource ID="ProjectsSource" runat="server" ConnectionString="<%$ ConnectionStrings:ConnectionString %>"
                                                                SelectCommand="GetAllProjects"></asp:SqlDataSource>
                                                            <asp:HiddenField ID="hiddenProjectId" runat="server" />
                                                        </div>
                                                    </div>
                                                    <div class="mb-16"></div>
                                                </div>
                                                <div id="divAssignPartners" runat="server" visible="false">
                                                    <div id="divRoomwithScope" runat="server">
                                                        <div class="flex flex-col sm:flex-row items-center p-5 delearWapper">
                                                            <div>
                                                                <asp:Button ID="btnBackToProjectlist" runat="server" CssClass="button bg-theme-1 text-white  w-24" Text="Back" OnClick="btnBackToProjectlist_Click" />
                                                            </div>
                                                        </div>
                                                        <div class="flex flex-col p-5">
                                                            <div id="divPartnerGrid" runat="server">
                                                                <dx:aspxgridview id="GridPartner" runat="server" clientinstancename="GridPartner" width="100%" autogeneratecolumns="False" keyfieldname="ScopeId" datasourceid="PartnerDataSource"
                                                                    enablerowscache="false" enablecallbacks="false" styles-alternatingrow-enabled="True">
                                                                    <settingsadaptivity adaptivitymode="HideDataCells" allowonlyoneadaptivedetailexpanded="true"></settingsadaptivity>
                                                                    <columns>
                                                                        <dx:gridviewdatatextcolumn fieldname="ScopeId" readonly="true" visibleindex="0" cellstyle-horizontalalign="Left" visible="false">
                                                                        </dx:gridviewdatatextcolumn>
                                                                        <dx:gridviewdatatextcolumn fieldname="Scope" caption="Work Type" readonly="true" visibleindex="2" cellstyle-horizontalalign="Left">
                                                                        </dx:gridviewdatatextcolumn>
                                                                        <dx:gridviewdatatextcolumn fieldname="PartnerName" caption="Partner" readonly="true" visibleindex="3" cellstyle-horizontalalign="Left">
                                                                        </dx:gridviewdatatextcolumn>
                                                                        <dx:gridviewdatacolumn fieldname="ProjectID" width="200px" caption="#" adaptivepriority="0" visibleindex="9" cellstyle-horizontalalign="Center">
                                                                            <dataitemtemplate>
                                                                                <asp:Button ID="lnkAssign" runat="server" Text="Assign" CssClass="button bg-theme-1 text-white w-24" CommandArgument='<%# Eval("ScopeId") %>' OnClick="lnkAssign_Click" />
                                                                            </dataitemtemplate>
                                                                        </dx:gridviewdatacolumn>
                                                                    </columns>
                                                                </dx:aspxgridview>
                                                                <asp:SqlDataSource ID="PartnerDataSource" runat="server" ConnectionString="<%$ ConnectionStrings:ConnectionString %>"
                                                                    SelectCommand="GetRoomAndScopeForPartners" SelectCommandType="StoredProcedure">
                                                                    <SelectParameters>
                                                                        <asp:ControlParameter ControlID="hiddenProjectId" Name="ProjectID" />
                                                                    </SelectParameters>
                                                                </asp:SqlDataSource>
                                                                <asp:HiddenField ID="hdnPartnerAssigned" runat="server" />
                                                                <asp:HiddenField ID="hdnPartnerValue" runat="server" />
                                                                <asp:HiddenField ID="hdnScopeID" runat="server" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div id="divAssginingPartner" runat="server" visible="false">
                                                        <div class="flex flex-col sm:flex-row items-center p-5 delearWapper">
                                                            <div>
                                                                <asp:Button ID="btnBackToPartner" runat="server" CssClass="button bg-theme-1 text-white  w-24" Text="Back" OnClick="btnBackToPartner_Click" />
                                                            </div>
                                                        </div>
                                                        <div class="flex flex-col p-5">
                                                            <div id="divAssignForm" runat="server">
                                                                <div>
                                                                    <div class="mangPromFormOut">
                                                                        <div class="mt-3 inputLt dropDowndxe">
                                                                            <label>Partner:</label>
                                                                            <dx:aspxcombobox id="cmbPartners" runat="server" cssclass="dateList mt-2" valuetype="System.String" textfield="PartnerName" onselectedindexchanged="cmbPartners_SelectedIndexChanged" autopostback="true" valuefield="PartnerID" selectedindex="-1">
                                                                            </dx:aspxcombobox>
                                                                        </div>
                                                                        <div class="mt-3 inputRt dropDowndxe">
                                                                            <label>Scope:</label>
                                                                            <asp:TextBox runat="server" ID="txtScope" CssClass="input w-full border mt-2"></asp:TextBox>
                                                                        </div>
                                                                    </div>
                                                                    <div class="mangPromFormOut ">
                                                                        <div class="mt-3 inputLt dropDowndxe">
                                                                            <label>Date :</label>
                                                                            <dx:aspxdateedit id="DtDate" runat="server" clientinstancename="DtDate"
                                                                                cssclass="dateList mt-2" displayformatstring="dd/MMM/yyyy HH:mm" editformatstring="dd/MMM/yyyy HH:mm" allownull="false" width="100%" height="30">
                                                                                <validationsettings display="Dynamic" setfocusonerror="True" causesvalidation="false" errordisplaymode="ImageWithTooltip">
                                                                                    <requiredfield isrequired="false"></requiredfield>
                                                                                </validationsettings>
                                                                                <timesectionproperties visible="true">
                                                                                    <timeeditproperties editformatstring="HH:mm" />
                                                                                </timesectionproperties>
                                                                                <calendarproperties>
                                                                                    <fastnavproperties displaymode="Inline" />
                                                                                </calendarproperties>
                                                                            </dx:aspxdateedit>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="mt-3">
                                                                    <asp:Button ID="btnAssignPartner" runat="server" class="button bg-theme-1 text-white w-24" Text="Create" CausesValidation="true" ValidationGroup="" OnClick="btnAssignPartner_Click"></asp:Button>
                                                                    <asp:Button ID="btnCancelPartner" runat="server" CssClass="button ml-2 border text-gray-700 mr-1 w-24" Text="CANCEL" CausesValidation="false" OnClick="btnCancelPartner_Click" />
                                                                </div>
                                                                <div class="mt-3">
                                                                    <dx:aspxgridview id="GridAssignedDataPartner" runat="server" clientinstancename="GridAssignedDataPartner" width="50%" autogeneratecolumns="False"
                                                                        enablerowscache="false" enablecallbacks="false" styles-alternatingrow-enabled="True" keyfieldname="PartnerProjectID" onpageindexchanged="GridAssignedDataPartner_PageIndexChanged">
                                                                        <settingsadaptivity adaptivitymode="HideDataCells" allowonlyoneadaptivedetailexpanded="true"></settingsadaptivity>
                                                                        <columns>
                                                                            <dx:gridviewdatatextcolumn fieldname="PartnerProjectID" readonly="true" visibleindex="0" cellstyle-horizontalalign="Left" visible="false">
                                                                            </dx:gridviewdatatextcolumn>
                                                                            <dx:gridviewdatatextcolumn fieldname="AppointmentDateTime" caption="Appointment Date" readonly="true" visibleindex="1" cellstyle-horizontalalign="Left">
                                                                            </dx:gridviewdatatextcolumn>
                                                                        </columns>
                                                                    </dx:aspxgridview>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div id="divPayments" runat="server" visible="false">
                                                    <div class="p-5">
                                                        <div class="flex flex-col sm:flex-row items-center delearWapper" id="divTop" runat="server">
                                                            <b>Pending Amount :
                                                            <asp:Label ID="lblPendingAmount" runat="server"></asp:Label>, &nbsp; &nbsp; Status :
                                                            <asp:Label ID="lblStatus" runat="server"></asp:Label>, &nbsp; &nbsp; 
                                                            Total Amount :
                                                            <asp:Label ID="lblTotalAmount" runat="server"></asp:Label></b>
                                                            &nbsp; &nbsp;
                                                            <div class="w-full sm:w-auto flex items-center sm:ml-auto mt-3 sm:mt-0">
                                                                <asp:Button ID="btnPaymentAltration" runat="server" CssClass="button bg-theme-1 text-white w-28 mr-2" Text="Payment Alteration" OnClick="btnPaymentAltration_Click" />
                                                                <asp:Button ID="btnBack" runat="server" CssClass="button border text-gray-700 mr-1 w-24" Text="Back" OnClick="btnBack_Click" />
                                                                <asp:Button ID="btnPaymentNew" runat="server" CssClass="button bg-theme-1 text-white w-24 ml-2" Text="New Payment" OnClick="btnPaymentNew_Click" />
                                                            </div>
                                                        </div>
                                                        <div id="divPaymentForm" runat="server" visible="false">
                                                            <div>
                                                                <div class="mangPromFormOut">
                                                                    <div class="mt-3 inputLt dropDowndxe">
                                                                        <label>Payment Method:*</label>
                                                                        <dx:aspxcombobox id="cmbPaymentMethod" runat="server" cssclass="dateList mt-2" valuetype="System.String" selectedindex="-1">
                                                                            <items>
                                                                                <dx:listedititem value="-1" text="---Select---" />
                                                                                <dx:listedititem value="3" text="Pay Now" />
                                                                                <dx:listedititem value="2" text="Bank Transfer" />
                                                                            </items>
                                                                        </dx:aspxcombobox>
                                                                        <asp:RequiredFieldValidator ID="reqPaymentMenthod" runat="server" Display="Dynamic" InitialValue="-1" ErrorMessage="Please select the payment method."
                                                                            ForeColor="Red" SetFocusOnError="true" ControlToValidate="cmbPaymentMethod" ValidationGroup="payment"></asp:RequiredFieldValidator>
                                                                    </div>
                                                                    <div class="mt-3 inputRt dropDowndxe">
                                                                        <label>Amount:*</label>
                                                                        <asp:TextBox runat="server" ID="txtPaymentAmount" CssClass="input w-full border mt-2"></asp:TextBox>
                                                                        <asp:RequiredFieldValidator ID="reqAmount" runat="server" Display="Dynamic" ErrorMessage="Please enter the amount."
                                                                            ForeColor="Red" SetFocusOnError="true" ControlToValidate="txtPaymentAmount" ValidationGroup="payment"></asp:RequiredFieldValidator>
                                                                    </div>
                                                                </div>
                                                                <div class="mangPromFormOut">
                                                                    <div class="mt-3 inputLt dropDowndxe">
                                                                        <label>Remarks:</label>
                                                                        <asp:TextBox runat="server" ID="txtPaymentRemarks" TextMode="MultiLine" Height="120px" CssClass="input w-full border mt-2"></asp:TextBox>
                                                                    </div>
                                                                    <div class="mt-3 inputRt dropDowndxe">
                                                                        <label>Transaction ID:</label>
                                                                        <asp:TextBox runat="server" ID="txtTransactionID" CssClass="input w-full border mt-2"></asp:TextBox>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div class="mt-3">
                                                                <asp:Button ID="btnPaymentSubmit" runat="server" class="button bg-theme-1 text-white w-24" Text="Create" CausesValidation="true" ValidationGroup="payment" OnClick="btnPaymentSubmit_Click"></asp:Button>
                                                                <asp:Button ID="btnPaymentCancel" runat="server" CssClass="button ml-2 border text-gray-700 mr-1 w-24" Text="CANCEL" CausesValidation="false" OnClick="btnPaymentCancel_Click" />
                                                            </div>
                                                        </div>
                                                        <div id="divGrid" runat="server">
                                                            <div class="mt-3">
                                                                <dx:aspxgridview id="GridPayment" runat="server" clientinstancename="GridPayment" width="100%" autogeneratecolumns="False" keyfieldname="PaymentID"
                                                                    enablerowscache="false" datasourceid="PaymentSource" enablecallbacks="false" styles-alternatingrow-enabled="True" styles-alternatingrow-backcolor="#ece9e9">
                                                                    <settingsadaptivity adaptivitymode="HideDataCells" allowonlyoneadaptivedetailexpanded="false"></settingsadaptivity>
                                                                    <columns>
                                                                        <dx:gridviewdatatextcolumn fieldname="PaidOn" readonly="True" visibleindex="1" adaptivepriority="1" caption="Date Of Payment" cellstyle-horizontalalign="Left"></dx:gridviewdatatextcolumn>
                                                                        <dx:gridviewdatatextcolumn fieldname="Status" readonly="True" visibleindex="2" adaptivepriority="2" caption="Status" cellstyle-horizontalalign="Left"></dx:gridviewdatatextcolumn>
                                                                        <dx:gridviewdatatextcolumn fieldname="Method" readonly="True" visibleindex="3" adaptivepriority="3" caption="Method" cellstyle-horizontalalign="Left"></dx:gridviewdatatextcolumn>
                                                                        <dx:gridviewdatatextcolumn fieldname="PaidAmount" readonly="True" visibleindex="4" adaptivepriority="4" caption="Amount" cellstyle-horizontalalign="Left"></dx:gridviewdatatextcolumn>
                                                                        <dx:gridviewdatatextcolumn fieldname="Description" readonly="True" visibleindex="5" adaptivepriority="5" caption="Description" cellstyle-horizontalalign="Left"></dx:gridviewdatatextcolumn>
                                                                        <dx:gridviewdataimagecolumn fieldname="PaymentImageURL" visibleindex="6" caption="Payment Image" adaptivepriority="6"
                                                                            propertiesimage-imagewidth="60px">
                                                                        </dx:gridviewdataimagecolumn>
                                                                        <dx:gridviewdatacolumn fieldname="PaymentID" width="200px" caption="#" adaptivepriority="7" visibleindex="7">
                                                                            <dataitemtemplate>
                                                                                <div class="dropdown relative">
                                                                                    <div class="dropdown-toggle button inline-block bg-theme-1 text-white">Options</div>
                                                                                    <div class="dropdown-box mt-10 absolute w-40 top-0 left-0 z-20">
                                                                                        <div class="dropdown-box__content box p-2">
                                                                                            <asp:LinkButton ID="lnkPaymentApprove" runat="server" CssClass="block p-2 transition duration-300 ease-in-out bg-white hover:bg-gray-200 rounded-md" Visible='<%# !Convert.ToBoolean(Convert.ToInt32(Eval("ApprovalStatus"))) %>' OnClick="lnkPaymentApprove_Click" CommandArgument='<% #Bind("PaymentID")%>'>Approve</asp:LinkButton>
                                                                                            <asp:LinkButton ID="lnkPaymentView" runat="server" Visible='<%# Convert.ToBoolean(Convert.ToInt32(Eval("IsViewButtonVisible"))) %>' CssClass="block p-2 transition duration-300 ease-in-out bg-white hover:bg-gray-200 rounded-md" OnClick="lnkPaymentView_Click" CommandArgument='<% #Bind("PaymentID")%>'>View</asp:LinkButton>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </dataitemtemplate>
                                                                            <settings allowheaderfilter="False" allowautofilter="False" />
                                                                        </dx:gridviewdatacolumn>
                                                                    </columns>
                                                                    <settings showfooter="true" />
                                                                    <totalsummary>
                                                                        <dx:aspxsummaryitem fieldname="PaidAmount" summarytype="Sum" />
                                                                    </totalsummary>
                                                                </dx:aspxgridview>
                                                                <asp:SqlDataSource ID="PaymentSource" runat="server" ConnectionString="<%$ ConnectionStrings:ConnectionString %>"
                                                                    SelectCommand="GetProjectPaymentDetailsForAdmin" SelectCommandType="StoredProcedure">
                                                                    <SelectParameters>
                                                                        <asp:ControlParameter ControlID="hiddenProjectId" Name="ProjectID" />
                                                                    </SelectParameters>
                                                                </asp:SqlDataSource>
                                                                <div class="mb-16"></div>
                                                            </div>
                                                        </div>
                                                        <div id="divPaymentAltration" runat="server" visible="false">
                                                            <div class="flex flex-col sm:flex-row items-center delearWapper">
                                                                <b>Pending Amount :
                                                            <asp:Label ID="lblPendingAmountAltration" runat="server"></asp:Label>,  &nbsp; &nbsp; 
                                                            Total Amount :
                                                            <asp:Label ID="lblTotalAmountAltration" runat="server"></asp:Label></b>
                                                                &nbsp; &nbsp;
                                                            </div>
                                                            <div>
                                                                <div class="mangPromFormOut">
                                                                    <div class="mt-3 inputLt dropDowndxe">
                                                                        <label>Final Adjustment Cost:</label>
                                                                        <asp:TextBox runat="server" ID="txtFinalAdjustmentCost" CssClass="input w-full border mt-2" AutoPostBack="true" OnTextChanged="txtFinalAdjustmentCost_TextChanged"></asp:TextBox>
                                                                    </div>
                                                                    <div class="mt-3 inputLt dropDowndxe">
                                                                        <label>Cost Difference:</label>
                                                                        <asp:TextBox runat="server" ID="txtCostDifference" CssClass="input w-full border mt-2" ReadOnly="true"></asp:TextBox>
                                                                    </div>
                                                                </div>
                                                                <div class="mt-3">
                                                                    <asp:Button ID="btnCostSave" runat="server" class="button bg-theme-1 text-white w-24" Text="Save" CausesValidation="true" ValidationGroup="cost" OnClick="btnCostSave_Click"></asp:Button>
                                                                    <asp:Button ID="btnCostCancel" runat="server" CssClass="button ml-2 border text-gray-700 mr-1 w-24" Text="CANCEL" CausesValidation="false" OnClick="btnCostCancel_Click" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </dx:contentcontrol>
                                        </contentcollection>
                                    </dx:tabpage>
                                    <dx:tabpage text="Partners" activetabstyle-font-bold="true">
                                        <contentcollection>
                                            <dx:contentcontrol>
                                                <div id="divPartners" runat="server">
                                                    <div class="flex flex-col sm:flex-row items-center p-5 delearWapper" id="Div2" runat="server">
                                                        <div class="delearOuter">
                                                            <asp:TextBox ID="txtPartnerSearch" runat="server" CssClass="input w-full border mt-2 mr-2"></asp:TextBox>
                                                            <asp:Button ID="btnPartnerSearch" runat="server" CssClass="button bg-theme-1 text-white mt-2" Text="Search" OnClick="btnPartnerSearch_Click" />
                                                        </div>
                                                        <div class="delearDate delearDateSub">
                                                            <dx:aspxdateedit id="DatePartFrom" clientinstancename="DatePartFrom" runat="server" placeholder="Start Date" tooltip="Start Date"
                                                                cssclass="dateList" displayformatstring="MMM/dd/yyyy" editformatstring="MMM/dd/yyyy" allownull="false" allowuserinput="false" nulltext="From date">
                                                            </dx:aspxdateedit>
                                                            <dx:aspxdateedit id="DatePartTo" clientinstancename="DatePartTo" runat="server" placeholder="End Date"
                                                                cssclass="dateList" displayformatstring="MMM/dd/yyyy" editformatstring="MMM/dd/yyyy" allownull="false" allowuserinput="false" nulltext="To date">
                                                            </dx:aspxdateedit>
                                                            <div class="delearButFilter">
                                                                <asp:Button ID="btnPartnerDateSearch" runat="server" CssClass="button bg-theme-1 text-white w-24" Text="Filter" OnClick="btnPartnerDateSearch_Click" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div class="flex flex-col p-5">
                                                        <div id="divPartnerListGrid" runat="server">
                                                            <dx:aspxgridview id="GridPartners" runat="server" clientinstancename="GridPartners" width="100%" autogeneratecolumns="False" keyfieldname="ProjectID"
                                                                enablerowscache="false" enablecallbacks="false" datasourceid="PartnerSource" styles-alternatingrow-enabled="True">
                                                                <settingsadaptivity adaptivitymode="HideDataCells" allowonlyoneadaptivedetailexpanded="true"></settingsadaptivity>
                                                                <columns>
                                                                    <dx:gridviewdatatextcolumn fieldname="ProjectID" caption="Project ID" readonly="true" visibleindex="1" cellstyle-horizontalalign="Left">
                                                                    </dx:gridviewdatatextcolumn>
                                                                    <dx:gridviewdatatextcolumn fieldname="ProjectDate" caption="Created On" readonly="true" visibleindex="2" cellstyle-horizontalalign="Left">
                                                                    </dx:gridviewdatatextcolumn>
                                                                    <dx:gridviewdatatextcolumn fieldname="UserName" readonly="True" caption="User name" visibleindex="3" cellstyle-horizontalalign="Left">
                                                                    </dx:gridviewdatatextcolumn>
                                                                    <dx:gridviewdatatextcolumn fieldname="PartnerName" caption="Partner" readonly="True" visibleindex="6" cellstyle-horizontalalign="Left">
                                                                    </dx:gridviewdatatextcolumn>
                                                                    <dx:gridviewdatatextcolumn fieldname="UserRequestedDate" caption="Requested date" readonly="True" visibleindex="7" cellstyle-horizontalalign="Left">
                                                                    </dx:gridviewdatatextcolumn>
                                                                    <dx:gridviewdatatextcolumn fieldname="AppointmentDateTime" caption="Appointment date" readonly="True" visibleindex="7" cellstyle-horizontalalign="Left">
                                                                    </dx:gridviewdatatextcolumn>
                                                                    <dx:gridviewdatatextcolumn fieldname="WorkStatus" caption="Status" readonly="True" visibleindex="7" cellstyle-horizontalalign="Left">
                                                                    </dx:gridviewdatatextcolumn>
                                                                    <dx:gridviewdatatextcolumn fieldname="WorkType" caption="Work type" readonly="True" visibleindex="7" cellstyle-horizontalalign="Left">
                                                                    </dx:gridviewdatatextcolumn>
                                                                    <dx:gridviewdatacolumn fieldname="ProjectID" width="200px" caption="#" adaptivepriority="0" visibleindex="9">
                                                                        <dataitemtemplate>
                                                                            <div class="dropdown relative">
                                                                                <div class="dropdown-toggle button inline-block bg-theme-1 text-white">Options</div>
                                                                                <div class="dropdown-box mt-10 absolute w-40 top-0 left-0 z-20">
                                                                                    <div class="dropdown-box__content box p-2">
                                                                                        <asp:LinkButton ID="lnkReschedule" runat="server" Text="Reschedule" CssClass="block p-2 transition duration-300 ease-in-out bg-white hover:bg-gray-200 rounded-md" OnClick="lnkReschedule_Click" CommandName='<% #Eval("ScopeID") + " " + Eval("PartnerID") %>' CommandArgument='<% #Bind("ProjectID")%>' />
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </dataitemtemplate>
                                                                    </dx:gridviewdatacolumn>
                                                                </columns>
                                                                <settingspager pagesize="10" numericbuttoncount="3" />
                                                                <settings showfilterrow="true" />
                                                            </dx:aspxgridview>
                                                            <asp:SqlDataSource ID="PartnerSource" runat="server" ConnectionString="<%$ ConnectionStrings:ConnectionString %>"
                                                                SelectCommand="GetProjectPartnerDetails"></asp:SqlDataSource>
                                                            <asp:HiddenField ID="hdnProjectID" runat="server" />
                                                            <asp:HiddenField ID="hdnPartnerID" runat="server" />
                                                            <asp:HiddenField ID="hdnRescheduleScopeID" runat="server" />
                                                        </div>
                                                    </div>
                                                    <div class="mb-16"></div>
                                                </div>
                                            </dx:contentcontrol>
                                        </contentcollection>
                                    </dx:tabpage>
                                </tabpages>
                            </dx:aspxpagecontrol>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <pagecontrol:errordisplay runat="server" id="ErrorDisplay" />
    <dx:aspxpopupcontrol id="popApprove" runat="server" clientinstancename="popApprove" width="350px"
        modal="True" height="90px" showclosebutton="true" popuphorizontalalign="WindowCenter"
        popupverticalalign="WindowCenter" enablehierarchyrecreation="True" appearafter="1000"
        disappearafter="1500" showpagescrollbarwhenmodal="False" border-borderwidth="0px"
        closeaction="CloseButton" headertext="Approve Payment">
        <modalbackgroundstyle backcolor="Gray" opacity="50">
        </modalbackgroundstyle>
        <border borderwidth="0px"></border>
        <clientsideevents popup="popup" shown="function(s){setTimeout(function() {s.UpdatePosition();}, 0);}" />
        <contentcollection>
            <dx:popupcontrolcontentcontrol id="PopupControlContentControl1" runat="server">
                <div id="div1" runat="server" class="p-5">
                    <div>
                        <div class="mangPromFormOut">
                            <div class="mt-3 inputLt">
                                <label>Payment Method:*</label>
                                <dx:aspxcombobox id="cmbApprovePaymentMethod" runat="server" cssclass="dateList mt-2" valuetype="System.String" selectedindex="-1">
                                    <items>
                                        <dx:listedititem value="-1" text="---Select---" />
                                        <dx:listedititem value="3" text="Pay Now" />
                                        <dx:listedititem value="2" text="Bank Transfer" />
                                    </items>
                                </dx:aspxcombobox>
                                <asp:RequiredFieldValidator ID="reqApproveMethod" runat="server" Display="Dynamic" InitialValue="-1" ErrorMessage="Please select the payment method."
                                    ForeColor="Red" SetFocusOnError="true" ControlToValidate="cmbApprovePaymentMethod" ValidationGroup="approve"></asp:RequiredFieldValidator>
                            </div>
                            <div class="mt-3 inputRt">
                                <label>Amount:*</label>
                                <asp:TextBox runat="server" ID="txtApproveAmount" CssClass="input w-full border mt-2"></asp:TextBox>
                                <asp:RequiredFieldValidator ID="reqApproveAmount" runat="server" Display="Dynamic" ErrorMessage="Please enter the amount."
                                    ForeColor="Red" SetFocusOnError="true" ControlToValidate="txtApproveAmount" ValidationGroup="approve"></asp:RequiredFieldValidator>
                            </div>
                        </div>
                        <div class="mangPromFormOut">
                            <div class="mt-3 inputLt">
                                <label>Remarks:</label>
                                <asp:TextBox runat="server" ID="txtApproveRemarks" TextMode="MultiLine" Height="120px" CssClass="input w-full border mt-2"></asp:TextBox>
                            </div>
                            <div class="mt-3 inputRt">
                                <label>Transaction ID:</label>
                                <asp:TextBox runat="server" ID="txtApproveTransactionID" CssClass="input w-full border mt-2"></asp:TextBox>
                            </div>
                        </div>
                    </div>
                    <div class="mt-3">
                        <asp:Button ID="btnApprove" runat="server" class="button bg-theme-1 text-white w-24" Text="Approve" CausesValidation="true" ValidationGroup="approve" OnClick="btnApprove_Click"></asp:Button>
                        <asp:Button ID="btnClose" runat="server" CssClass="button ml-2 border text-gray-700 mr-1 w-24" Text="Close" CausesValidation="false" OnClick="btnClose_Click" />
                    </div>
                </div>
            </dx:popupcontrolcontentcontrol>
        </contentcollection>
    </dx:aspxpopupcontrol>
    <dx:aspxpopupcontrol id="pcIamge" runat="server" closeaction="CloseButton" closeonescape="true" width="300px"
        popuphorizontalalign="WindowCenter" popupverticalalign="WindowCenter" clientinstancename="pcIamge" headertext="">
        <clientsideevents popup="popupImage" shown="function(s){setTimeout(function() {s.UpdatePosition();}, 0);}" />
        <contentcollection>
            <dx:popupcontrolcontentcontrol runat="server">
                <div class="p-5">
                    <asp:Image runat="server" ID="PaymentImage" AlternateText="No image available" Style="width: 100%; height: auto;" />
                </div>
            </dx:popupcontrolcontentcontrol>
        </contentcollection>
        <contentstyle>
            <paddings padding="15px" />
        </contentstyle>
    </dx:aspxpopupcontrol>
    <dx:aspxpopupcontrol id="pcStatus" runat="server" closeaction="CloseButton" closeonescape="true" width="300px"
        popuphorizontalalign="WindowCenter" popupverticalalign="WindowCenter" clientinstancename="pcStatus" headertext="">
        <clientsideevents popup="popUpStatus" shown="function(s){setTimeout(function() {s.UpdatePosition();}, 0);}" />
        <contentcollection>
            <dx:popupcontrolcontentcontrol runat="server">
                <div class="p-4">
                    <div>
                        <div class="">
                            <div class="inputLt">
                                <b>
                                    <asp:Label ID="lblRequestID" runat="server"></asp:Label></b>
                            </div>
                        </div>
                        <div class="">
                            <div class="inputLt">
                                <b>
                                    <asp:Label ID="lblStatusText" runat="server"></asp:Label></b>
                            </div>
                        </div>
                        <div class="">
                            <div class="mt-3">
                                <label>Status:</label>
                                <dx:aspxcombobox id="cmbStatus" runat="server" cssclass="dateList mt-2" valuetype="System.String" selectedindex="-1" width="100%">
                                    <items>
                                        <dx:listedititem value="-1" text="---Select---" />
                                        <dx:listedititem value="2" text="Partner verification approval" />
                                        <dx:listedititem value="7" text="Partner Approved" />
                                        <dx:listedititem value="3" text="Admin approval" />
                                        <dx:listedititem value="8" text="Completed" />
                                        <dx:listedititem value="9" text="Cancelled" />
                                    </items>
                                </dx:aspxcombobox>
                                <asp:RequiredFieldValidator ID="RequiredFieldValidator1" runat="server" Display="Dynamic" InitialValue="-1" ErrorMessage="Please select the status."
                                    ForeColor="Red" SetFocusOnError="true" ControlToValidate="cmbStatus" ValidationGroup="status"></asp:RequiredFieldValidator>
                            </div>
                        </div>
                        <div class="mt-3">
                            <asp:Button ID="btnStatusUpdate" runat="server" class="button bg-theme-1 text-white w-24" Text="Update" CausesValidation="true" ValidationGroup="status" OnClick="btnStatusUpdate_Click"></asp:Button>
                            <asp:Button ID="btnStatusUpdateCancel" runat="server" CssClass="button ml-2 border text-gray-700 mr-1 w-24" Text="Cancel" CausesValidation="false" OnClick="btnStatusUpdateCancel_Click" />
                        </div>

                    </div>
                </div>
            </dx:popupcontrolcontentcontrol>
        </contentcollection>
        <contentstyle>
            <paddings padding="15px" />
        </contentstyle>
    </dx:aspxpopupcontrol>
    <dx:aspxpopupcontrol id="popUpReschedule" runat="server" clientinstancename="popUpReschedule" width="480px"
        modal="True" height="90px" showclosebutton="true" popuphorizontalalign="WindowCenter"
        popupverticalalign="WindowCenter" enablehierarchyrecreation="True" appearafter="1000"
        disappearafter="1500" showpagescrollbarwhenmodal="False" border-borderwidth="0px"
        closeaction="CloseButton" headertext="Reschedule Appointment">
        <modalbackgroundstyle backcolor="Gray" opacity="50">
        </modalbackgroundstyle>
        <border borderwidth="0px"></border>
        <clientsideevents popup="popupReschedule" shown="function(s){setTimeout(function() {s.UpdatePosition();}, 0);}" />
        <contentcollection>
            <dx:popupcontrolcontentcontrol id="PopupControlContentControl2" runat="server">
                <div id="div3" runat="server" class="p-5">
                    <div>
                        <div class="">
                            <div class="mt-3">
                                <label>Date :</label>
                                <dx:aspxdateedit id="dtReschedule" runat="server" clientinstancename="dtReschedule"
                                    cssclass="dateList mt-2" displayformatstring="dd/MMM/yyyy HH:mm" editformatstring="dd/MMM/yyyy HH:mm" allownull="false" width="100%" height="30">
                                    <validationsettings display="Dynamic" setfocusonerror="True" causesvalidation="false" errordisplaymode="ImageWithTooltip" validationgroup="Reschedule">
                                        <requiredfield isrequired="false"></requiredfield>
                                    </validationsettings>
                                    <timesectionproperties visible="true">
                                        <timeeditproperties editformatstring="HH:mm" />
                                    </timesectionproperties>
                                    <calendarproperties>
                                        <fastnavproperties displaymode="Inline" />
                                    </calendarproperties>
                                </dx:aspxdateedit>

                            </div>
                        </div>
                    </div>
                    <div class="mt-3">
                        <asp:Button ID="btnUpdateAppointmentDate" runat="server" class="button bg-theme-1 text-white w-24" Text="Update" CausesValidation="true" ValidationGroup="Reschedule" OnClick="btnUpdateAppointmentDate_Click"></asp:Button>
                        <asp:Button ID="btnCanelPopUpReschedule" runat="server" CssClass="button ml-2 border text-gray-700 mr-1 w-24" Text="Cancel" CausesValidation="false" OnClick="btnCanelPopUpReschedule_Click" />
                    </div>
                </div>
            </dx:popupcontrolcontentcontrol>
        </contentcollection>
    </dx:aspxpopupcontrol>
    <dx:aspxpopupcontrol id="popUpDocuments" runat="server" closeaction="CloseButton" closeonescape="true" width="300px"
        popuphorizontalalign="WindowCenter" popupverticalalign="WindowCenter" clientinstancename="popUpDocuments" headertext="Download Documents">
        <clientsideevents popup="popupDocument" shown="function(s){setTimeout(function() {s.UpdatePosition();}, 0);}" />
        <contentcollection>
            <dx:popupcontrolcontentcontrol runat="server">
                <div>
                    <div>
                        <div class="flex flex-col sm:flex-row items-center mb-2 top-bar">
                            <label class="font-medium text-base mr-auto">Floor Plan</label>
                            <asp:Button ID="btnFloorPlanDownload" runat="server" Text="Download" CssClass="button bg-theme-1 text-white" OnClick="btnFloorPlanDownload_Click" />
                            <asp:Label ID="lblFloorPlan" runat="server" Text="--Not Uploaded--" Visible="false"></asp:Label>
                        </div>
                        <div class="flex flex-col sm:flex-row items-center  mb-2 top-bar">
                            <label class="font-medium text-base mr-auto">Permit Form </label>
                            <asp:Button ID="btnPermitFormDownload" runat="server" Text="Download" CssClass="button bg-theme-1 text-white" OnClick="btnPermitFormDownload_Click" />
                            <asp:Label ID="lblPermitForm" runat="server" Text="--Not Uploaded--" Visible="false"></asp:Label>
                        </div>
                        <div class="flex flex-col sm:flex-row items-center mb-8 mt-6">
                            <label class="font-medium text-base mr-auto">Indemnity Form</label>
                            <asp:Button ID="btnIndemnityFormDownload" runat="server" Text="Download" CssClass="button bg-theme-1 text-white" OnClick="btnIndemnityFormDownload_Click" />
                            <asp:Label ID="lblIndemnityForm" runat="server" Text="--Not Uploaded--" Visible="false"></asp:Label>
                        </div>
                    </div>
                </div>
            </dx:popupcontrolcontentcontrol>
        </contentcollection>
        <contentstyle>
            <paddings padding="15px" />
        </contentstyle>
    </dx:aspxpopupcontrol>
</asp:Content>


