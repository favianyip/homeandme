<%@ Page Title="" Language="C#" MasterPageFile="~/MasterPage.master" AutoEventWireup="true" CodeFile="Home.aspx.cs" Inherits="Home" %>

<%@ Register Assembly="AjaxControlToolkit" Namespace="AjaxControlToolkit" TagPrefix="asp" %>

<asp:Content ID="Content1" ContentPlaceHolderID="head" runat="Server">
    <script type="text/javascript">
        if (window.location.hash && window.location.hash == '#_=_') {
            if (window.history && history.pushState) {
                window.history.pushState("", document.title, window.location.pathname);
            } else {
                var scroll = {
                    top: document.body.scrollTop,
                    left: document.body.scrollLeft
                };
                window.location.hash = '';
                document.body.scrollTop = scroll.top;
                document.body.scrollLeft = scroll.left;
            }
        }
    </script>
</asp:Content>
<asp:Content ID="Content2" ContentPlaceHolderID="ContentPlaceHolder1" runat="Server">
    <asp:ToolkitScriptManager ID="sm" runat="server" />
    <asp:UpdatePanel runat="server" ID="up">
        <ContentTemplate>
            <div class="hnm-home" style="background-image: url(../assets/images/home-bg.jpg);">
                <div class="hnm-home__box">
                    <div class="content-wrapper">
                        <h1 class="hnm-home__head">COMPLETING HOME WITH ME</h1>
                        <p class="hnm-home__desc">Create the home of your dreams. Get started with Home & Me now.</p>
                        <div class="hnm-home__customize">
                            I am looking to renovate my
                    <asp:DropDownList ID="drpPropertyType" runat="server" CssClass="hnm-home__select" DataSourceID="PropertyTypeSource"
                        DataTextField="Propertytype" DataValueField="PropertyTypeID" OnSelectedIndexChanged="drpPropertyType_SelectedIndexChanged" AutoPostBack="true">
                    </asp:DropDownList>
                            <asp:SqlDataSource ID="PropertyTypeSource" runat="server" ConnectionString="<%$ ConnectionStrings:ConnectionString %>"
                                SelectCommand="SELECT PropertyTypeID, Propertytype FROM PropertyTypes WHERE Status = 1"></asp:SqlDataSource>
                            having
                    <asp:DropDownList ID="drpBedRooms" runat="server" CssClass="hnm-home__select" DataTextField="NoOfRoom" DataValueField="PropertyTypeRoomID">
                    </asp:DropDownList>
                            and is a
                    <asp:DropDownList ID="drpFlatType" runat="server" CssClass="hnm-home__select">
                        <asp:ListItem Value="0">Resale</asp:ListItem>
                        <asp:ListItem Value="1">New</asp:ListItem>
                    </asp:DropDownList>
                            unit
                        </div>
                        <a class="hnm-button" data-toggle="modal" data-target="#reminderModal" href="javascript:void(0)">PROCEED TO NEXT</a>
                    </div>
                </div>
            </div>
            <div class="modal fade hnm-modal" id="reminderModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">REMINDER</h5>
                            <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div class="modal-body">
                            <p class="hnm-modal__desc">Please ensure you have a soft copy of your home floor plan or layout plan with you for document upload upon check out.</p>
                            <p class="hnm-modal__desc">Home And Me online platform is a portal for you to complete your home with cost transparency. </p>
                            <p class="hnm-modal__desc">You don’t have to sign up at this stage for your convenience but be reminded you are required to sign up and login upon check out to save your project.</p>
                            <div class="hnm-modal__btn">
                                <asp:LinkButton ID="lnkProceed" runat="server" CssClass="hnm-button" OnClick="lnkProceed_Click">PROCEED TO NEXT</asp:LinkButton>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </ContentTemplate>
    </asp:UpdatePanel>
</asp:Content>

